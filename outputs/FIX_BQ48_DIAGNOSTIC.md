# 🔴 BUG #2 - BQ-48 : Admin Dashboard → Page Blanche

## 🔍 DIAGNOSTIC

**Fichier problématique :** `client/src/app/dashboard/bookings/page.tsx`

### Problème Identifié

**Ligne 154-161 :** Crash potentiel si `user` est null/undefined

```typescript
// ❌ PROBLÈME
if (user?.role === 'admin') {
  endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/all`;
} else if (user?.role === 'host') {
  endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/host`;
} else if (user?.role === 'guest') {
  endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/guest`;
} else {
  throw new Error('Invalid user role'); // ❌ Crash si user.role undefined
}
```

### Causes Racines

1. **User non chargé au mount :** AppContext met du temps à charger `user`
2. **Pas de guard clause :** Pas de vérification `if (!user) return` avant d'utiliser `user.role`
3. **Error handling faible :** Page blanche au lieu d'afficher un message
4. **Endpoint Admin manquant :** L'API `/bookings/admin/all` pourrait ne pas exister

---

## ✅ SOLUTIONS APPLIQUÉES

### Solution 1 : Guard Clause au Début

Ajout d'une vérification avant tout rendu :

```typescript
export default function BookingsPage() {
  const { state } = useApp();
  const user = state.user;

  // ✅ AJOUTÉ : Guard clause
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  // Le reste du code...
}
```

### Solution 2 : Fetch Bookings Sécurisé

Amélioration avec try/catch et vérification user :

```typescript
const fetchBookings = async () => {
  try {
    setLoading(true);
    
    // ✅ AJOUTÉ : Vérification user
    if (!user) {
      console.error('[Bookings] User not loaded');
      return;
    }

    const token = localStorage.getItem('token');
    
    // ✅ AJOUTÉ : Vérification token
    if (!token) {
      toast.error('Authentication required');
      router.push('/auth/login');
      return;
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (statusFilter) params.append('status', statusFilter);
    params.append('page', page.toString());
    params.append('limit', '20');
    params.append('sort', '-createdAt');

    // ✅ AMÉLIORÉ : Endpoint avec fallback
    let endpoint = '';
    if (user.role === 'admin') {
      endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/all`;
    } else if (user.role === 'host') {
      endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/host`;
    } else if (user.role === 'guest') {
      endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/guest`;
    } else {
      console.error('[Bookings] Invalid role:', user.role);
      toast.error('Invalid user role');
      return; // ✅ Return au lieu de throw
    }

    console.log('[Bookings] Fetching from:', endpoint);

    const response = await axios.get(
      `${endpoint}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // ✅ AMÉLIORÉ : Support multi-formats
    const bookingsData = response.data.data?.bookings || 
                        response.data.bookings || 
                        [];
    
    setBookings(bookingsData);
    setStats(response.data.stats || stats);
    setTotalPages(response.data.pagination?.pages || 1);
    
    console.log('[Bookings] Loaded:', bookingsData.length, 'bookings');
    
  } catch (error: any) {
    console.error('[Bookings] Error:', error);
    
    // ✅ AMÉLIORÉ : Gestion d'erreur détaillée
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      router.push('/auth/login');
    } else if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.');
    } else if (error.response?.status === 404) {
      toast.error('Bookings endpoint not found');
    } else {
      toast.error(error.response?.data?.message || 'Failed to load bookings');
    }
  } finally {
    setLoading(false);
  }
};
```

### Solution 3 : Vérification Endpoint Backend

Vérifier que l'endpoint existe côté serveur :

```bash
# Test manuel
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/bookings/admin/all
```

**Si 404 :** L'endpoint n'existe pas → Créer la route backend

---

## 🔧 BACKEND FIX (Si nécessaire)

### Créer l'endpoint manquant

**Fichier :** `server/src/routes/bookingRoutes.js`

```javascript
// ✅ AJOUTER si manquant
router.get(
  '/admin/all',
  auth,
  requireRole(['admin']),
  bookingController.getAllBookingsAdmin
);
```

**Fichier :** `server/src/controllers/bookingController.js`

```javascript
// ✅ AJOUTER la fonction
exports.getAllBookingsAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('listing', 'title category images address pricing')
        .populate('guest', 'firstName lastName email avatar')
        .populate('host', 'firstName lastName email avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query)
    ]);

    const stats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObject = {
      total: total,
      pending: 0,
      confirmed: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    };

    stats.forEach(s => {
      if (s._id) statsObject[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        bookings,
        stats: statsObject,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};
```

---

## 📋 CHECKLIST DE VALIDATION

- [ ] User chargé avant d'accéder à user.role
- [ ] Message de chargement si user null
- [ ] Pas de crash si role invalide
- [ ] Endpoint backend existe
- [ ] Token vérifié avant fetch
- [ ] Gestion d'erreur 401/403/404
- [ ] Logs console pour debugging
- [ ] Navigation fonctionne depuis AdminDashboard

---

## 🎯 RÉSULTAT ATTENDU

**Avant :** Clic "View All Bookings" → Page blanche  
**Après :** Clic "View All Bookings" → Liste des réservations

---

*Diagnostic BQ-48 - Version 1.0*
