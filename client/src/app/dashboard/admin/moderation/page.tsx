'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Flag,
  TrendingUp,
  MessageSquare,
  Star,
  Plus,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ModerationLog {
  _id: string;
  contentType: 'message' | 'review';
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  originalContent: string;
  triggeredRules: Array<{
    ruleName: string;
    category: string;
    severity: string;
    score: number;
  }>;
  totalScore: number;
  action: 'allow' | 'flag' | 'block';
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'ignored';
  createdAt: string;
}

interface ModerationRule {
  _id: string;
  name: string;
  type: 'keyword' | 'pattern' | 'behavior';
  category: string;
  content: string;
  severity: 'low' | 'medium' | 'high';
  action: 'flag' | 'block';
  score: number;
  errorMessage?: string;
  appliesTo: string[];
  languages: string[];
  enabled: boolean;
  stats: {
    totalTriggered: number;
    totalBlocked: number;
    totalFlagged: number;
  };
}

interface ModerationStats {
  overview: {
    totalLogs: number;
    blockedCount: number;
    flaggedCount: number;
    pendingReview: number;
    blockRate: string;
  };
  byContentType: Array<{ _id: string; count: number }>;
  byAction: Array<{ _id: string; count: number }>;
  topRules: Array<{ _id: string; count: number; category: string }>;
  trend: Array<{ _id: string; count: number }>;
}

interface FlaggedMessage {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  conversation: {
    _id: string;
    subject?: string;
  };
  content: string;
  flagged: boolean;
  flagReason?: string;
  moderationFlags: string[];
  createdAt: string;
}

interface FlaggedReview {
  _id: string;
  reviewer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  listing: {
    _id: string;
    title: string;
    category?: string;
  };
  comment: string;
  rating: { overall: number };
  status: string;
  flagged: boolean;
  flagReason?: string;
  moderationFlags: string[];
  moderationScore?: number;
  createdAt: string;
}

export default function ModerationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'logs' | 'rules' | 'flagged' | 'stats'>('logs');
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<FlaggedReview[]>([]);
  const [flaggedFilter, setFlaggedFilter] = useState<'all' | 'messages' | 'reviews'>('all');
  const [flaggedPage, setFlaggedPage] = useState(1);
  const [flaggedPagination, setFlaggedPagination] = useState({ messagesTotal: 0, reviewsTotal: 0, messagesPages: 1, reviewsPages: 1 });
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ModerationLog | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ModerationRule | null>(null);

  // 2E: Read ?tab= from URL to auto-select tab (e.g. from notification link)
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && ['logs', 'rules', 'flagged', 'stats'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    else if (activeTab === 'rules') fetchRules();
    else if (activeTab === 'flagged') fetchFlaggedContent();
    else if (activeTab === 'stats') fetchStats();
  }, [activeTab]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/moderation/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.data.logs);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/moderation/rules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRules(res.data.data.rules);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/moderation/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlaggedContent = async (page = flaggedPage) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const limit = 15;

      const [messagesRes, reviewsRes] = await Promise.all([
        axios.get(`${API_URL}/moderation/flagged/messages?page=${page}&limit=${limit}`, { headers }),
        axios.get(`${API_URL}/moderation/flagged/reviews?page=${page}&limit=${limit}`, { headers })
      ]);

      setFlaggedMessages(messagesRes.data.data.messages);
      setFlaggedReviews(reviewsRes.data.data.reviews);
      setFlaggedPagination({
        messagesTotal: messagesRes.data.pagination.total,
        reviewsTotal: reviewsRes.data.pagination.total,
        messagesPages: messagesRes.data.pagination.pages,
        reviewsPages: reviewsRes.data.pagination.pages
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement du contenu flaggé');
    } finally {
      setLoading(false);
    }
  };

  const moderateMessage = async (messageId: string, action: 'unflag' | 'hide') => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/moderation/messages/${messageId}/action`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(action === 'unflag' ? 'Message approuvé' : 'Message masqué');
      fetchFlaggedContent();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const moderateReview = async (reviewId: string, action: 'unflag' | 'hide' | 'approve') => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/moderation/reviews/${reviewId}/action`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(action === 'hide' ? 'Avis masqué' : 'Avis approuvé');
      fetchFlaggedContent();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const reviewLog = async (logId: string, reviewStatus: 'approved' | 'rejected' | 'ignored', adminNotes?: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/moderation/logs/${logId}/review`,
        { reviewStatus, adminNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Contenu reviewé avec succès');
      fetchLogs();
      setSelectedLog(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la review');
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/moderation/rules/${ruleId}`,
        { enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Règle ${enabled ? 'activée' : 'désactivée'}`);
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/moderation/rules/${ruleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Règle supprimée');
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const seedDefaultRules = async () => {
    if (!confirm('Charger les règles par défaut ? (Cela peut écraser les règles existantes avec le même nom)')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/moderation/rules/seed`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Règles par défaut chargées avec succès');
      fetchRules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement');
    }
  };

  const COLORS = ['#FF6B35', '#004E89', '#F77F00', '#06A77D', '#9D4EDD'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-[#FF6B35]" />
          <h1 className="text-3xl font-bold text-gray-900">Modération</h1>
        </div>
        <p className="text-gray-600">Gestion de la modération automatique des messages et avis</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'logs', label: 'Logs', icon: Eye },
            { id: 'rules', label: 'Règles', icon: Shield },
            { id: 'flagged', label: 'Contenu Flaggé', icon: Flag },
            { id: 'stats', label: 'Statistiques', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-[#FF6B35] text-[#FF6B35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
        </div>
      ) : (
        <>
          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Logs de Modération</h2>
                <button
                  onClick={fetchLogs}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualiser
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun log de modération</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Règles</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {log.user.firstName} {log.user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{log.user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {log.contentType === 'message' ? <MessageSquare className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                              <span className="text-sm text-gray-900 capitalize">{log.contentType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.action === 'block' ? 'bg-red-100 text-red-800' :
                              log.action === 'flag' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.totalScore}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.triggeredRules.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' :
                              log.reviewStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                              log.reviewStatus === 'ignored' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.reviewStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(log.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-[#FF6B35] hover:text-[#e5622f]"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* RULES TAB */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Règles de Modération</h2>
                <div className="flex gap-2">
                  <button
                    onClick={seedDefaultRules}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Charger règles par défaut
                  </button>
                  <button
                    onClick={() => setShowRuleModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-orange-600 text-white rounded-lg hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle Règle
                  </button>
                </div>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Aucune règle configurée</p>
                  <button
                    onClick={seedDefaultRules}
                    className="px-6 py-2 bg-gradient-to-r from-[#FF6B35] to-orange-600 text-white rounded-lg"
                  >
                    Charger les règles par défaut
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {rules.map((rule) => (
                    <div key={rule._id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              rule.severity === 'high' ? 'bg-red-100 text-red-800' :
                              rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {rule.severity}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              rule.action === 'block' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {rule.action}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rule.enabled ? 'Activée' : 'Désactivée'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium">Type:</span> {rule.type}</p>
                            <p><span className="font-medium">Catégorie:</span> {rule.category}</p>
                            <p><span className="font-medium">Contenu:</span> <code className="bg-gray-100 px-2 py-1 rounded">{rule.content}</code></p>
                            <p><span className="font-medium">Score:</span> {rule.score}</p>
                            <p><span className="font-medium">S'applique à:</span> {rule.appliesTo.join(', ')}</p>
                            <p><span className="font-medium">Langues:</span> {rule.languages.join(', ')}</p>
                            {rule.errorMessage && <p><span className="font-medium">Message:</span> {rule.errorMessage}</p>}
                            <p className="text-xs text-gray-500 mt-2">
                              Stats: {rule.stats.totalTriggered} déclenchements ({rule.stats.totalBlocked} bloqués, {rule.stats.totalFlagged} flaggés)
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => toggleRule(rule._id, !rule.enabled)}
                            className={`p-2 rounded-lg ${
                              rule.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {rule.enabled ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => deleteRule(rule._id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FLAGGED TAB */}
          {activeTab === 'flagged' && (
            <div className="space-y-4">
              {/* Header + Filter + Refresh */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Contenu Flaggé</h2>
                  <span className="text-sm text-gray-500">
                    ({flaggedPagination.messagesTotal} messages, {flaggedPagination.reviewsTotal} avis)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {[
                      { id: 'all' as const, label: 'Tous' },
                      { id: 'messages' as const, label: 'Messages' },
                      { id: 'reviews' as const, label: 'Avis' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { setFlaggedFilter(f.id); setFlaggedPage(1); }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                          flaggedFilter === f.id
                            ? 'bg-white text-[#FF6B35] shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => fetchFlaggedContent()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Section */}
              {(flaggedFilter === 'all' || flaggedFilter === 'messages') && (
                <>
                  {flaggedFilter === 'all' && (
                    <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2 mt-2">
                      <MessageSquare className="w-4 h-4" /> Messages ({flaggedPagination.messagesTotal})
                    </h3>
                  )}
                  {flaggedMessages.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Aucun message flaggé</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {flaggedMessages.map((msg) => (
                        <div key={msg._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {msg.sender.firstName} {msg.sender.lastName}
                                </span>
                                <span className="text-xs text-gray-400">{msg.sender.email}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(msg.createdAt).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{msg.content}</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.moderationFlags.map((flag, i) => (
                                  <span key={i} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">{flag}</span>
                                ))}
                                {msg.flagReason && (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">{msg.flagReason}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => moderateMessage(msg._id, 'unflag')}
                                title="Approuver"
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moderateMessage(msg._id, 'hide')}
                                title="Masquer"
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => router.push(`/dashboard/messages?c=${msg.conversation?._id}`)}
                                title="Voir conversation"
                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Reviews Section */}
              {(flaggedFilter === 'all' || flaggedFilter === 'reviews') && (
                <>
                  {flaggedFilter === 'all' && (
                    <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2 mt-4">
                      <Star className="w-4 h-4" /> Avis ({flaggedPagination.reviewsTotal})
                    </h3>
                  )}
                  {flaggedReviews.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Star className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Aucun avis flaggé</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {flaggedReviews.map((review) => (
                        <div key={review._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {review.reviewer.firstName} {review.reviewer.lastName}
                                </span>
                                <span className="text-xs text-gray-400">{review.reviewer.email}</span>
                                <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                                  {review.rating.overall}/5
                                </span>
                                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                  review.status === 'published' ? 'bg-green-100 text-green-700' :
                                  review.status === 'hidden' ? 'bg-red-100 text-red-700' :
                                  review.status === 'flagged' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {review.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mb-1">
                                Annonce : <span className="font-medium text-gray-700">{review.listing.title}</span>
                                <span className="ml-2 text-gray-400">{new Date(review.createdAt).toLocaleDateString('fr-FR')}</span>
                              </p>
                              <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                              <div className="flex flex-wrap gap-1">
                                {review.moderationFlags.map((flag, i) => (
                                  <span key={i} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">{flag}</span>
                                ))}
                                {review.flagReason && (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">{review.flagReason}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => moderateReview(review._id, 'approve')}
                                title="Approuver"
                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moderateReview(review._id, 'hide')}
                                title="Masquer"
                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => router.push(`/listing/${review.listing._id}`)}
                                title="Voir annonce"
                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Pagination */}
              {(() => {
                const totalPages = Math.max(flaggedPagination.messagesPages, flaggedPagination.reviewsPages);
                if (totalPages <= 1) return null;
                return (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => { const p = flaggedPage - 1; setFlaggedPage(p); fetchFlaggedContent(p); }}
                      disabled={flaggedPage <= 1}
                      className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {flaggedPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => { const p = flaggedPage + 1; setFlaggedPage(p); fetchFlaggedContent(p); }}
                      disabled={flaggedPage >= totalPages}
                      className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Logs</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.overview.totalLogs}</p>
                    </div>
                    <Shield className="w-12 h-12 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Bloqués</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.overview.blockedCount}</p>
                    </div>
                    <XCircle className="w-12 h-12 text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Flaggés</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.overview.flaggedCount}</p>
                    </div>
                    <Flag className="w-12 h-12 text-yellow-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Taux de Blocage</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.overview.blockRate}%</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-[#FF6B35]" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Action */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Par Action</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.byAction}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {stats.byAction.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* By Content Type */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Par Type de Contenu</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.byContentType}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {stats.byContentType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trend Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Tendance (30 derniers jours)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#FF6B35" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top Rules */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Top 10 Règles Déclenchées</h3>
                <div className="space-y-2">
                  {stats.topRules.map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{rule._id}</span>
                        <span className="text-xs text-gray-500">({rule.category})</span>
                      </div>
                      <span className="text-sm font-semibold text-[#FF6B35]">{rule.count} fois</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Détails du Log</h3>
                <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Utilisateur</label>
                <p className="text-gray-900">{selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Contenu Original</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedLog.originalContent}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Règles Déclenchées</label>
                <div className="space-y-2 mt-2">
                  {selectedLog.triggeredRules.map((rule, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">{rule.ruleName}</p>
                      <p className="text-sm text-gray-600">Catégorie: {rule.category} | Sévérité: {rule.severity} | Score: {rule.score}</p>
                    </div>
                  ))}
                </div>
              </div>
              {selectedLog.reviewStatus === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => reviewLog(selectedLog._id, 'approved')}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Approuver
                  </button>
                  <button
                    onClick={() => reviewLog(selectedLog._id, 'rejected')}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="w-5 h-5 inline mr-2" />
                    Rejeter
                  </button>
                  <button
                    onClick={() => reviewLog(selectedLog._id, 'ignored')}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Ignorer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
