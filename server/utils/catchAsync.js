// Utility function to wrap async route handlers and catch errors
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};