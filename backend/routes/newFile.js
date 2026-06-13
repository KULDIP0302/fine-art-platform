const userController = require('../controllers/userController');
const { router } = require('./userRoutes');

router.post('/login', userController.login);
