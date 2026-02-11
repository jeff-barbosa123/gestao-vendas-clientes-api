const app = require('./app');
const { initDb } = require('./db');

const PORT = process.env.PORT || 3000;

// Tenta inicializar banco, mas permite continuar em desenvolvimento se não configurado
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API rodando na porta ${PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
        console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      }
    });
  })
  .catch((err) => {
    // Em desenvolvimento, permite continuar mesmo sem banco
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Falha ao iniciar o banco de dados:', err.message);
      process.exit(1);
    } else {
      console.warn('⚠️  Aviso: Banco de dados não configurado. Algumas funcionalidades podem não funcionar.');
      console.warn('💡 Para usar banco PostgreSQL, configure DATABASE_URL no .env.local');
      console.warn('📝 Continuando em modo desenvolvimento sem banco...\n');
      
      // Inicia servidor mesmo sem banco (algumas rotas podem não funcionar)
      app.listen(PORT, () => {
        console.log(`🚀 API rodando na porta ${PORT} (sem banco de dados)`);
        console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
        console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      });
    }
  });

