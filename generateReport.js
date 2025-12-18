// Script para gerar relatório HTML a partir do JSON do K6
const fs = require('fs');

// Lê o arquivo JSON (formato NDJSON - uma linha por objeto)
const lines = fs.readFileSync('results.json', 'utf8').split('\n').filter(line => line.trim());

// Processa as métricas
const metrics = {};
const checks = {};
let summary = {
  total_checks: 0,
  passed_checks: 0,
  failed_checks: 0,
  http_reqs: 0,
  http_req_failed: 0,
  http_req_duration: { values: [] }
};

lines.forEach(line => {
  try {
    const obj = JSON.parse(line);
    
    if (obj.type === 'Point' && obj.data) {
      const metricName = obj.metric;
      const value = obj.data.value;
      
      if (!metrics[metricName]) {
        metrics[metricName] = { values: [], count: 0, sum: 0 };
      }
      
      metrics[metricName].values.push(value);
      metrics[metricName].count++;
      metrics[metricName].sum += value;
      
      // Coleta dados específicos
      if (metricName === 'http_reqs') summary.http_reqs += value || 0;
      if (metricName === 'http_req_failed') summary.http_req_failed += value || 0;
      if (metricName === 'http_req_duration' && value) {
        summary.http_req_duration.values.push(value);
      }
      if (metricName === 'checks' && obj.data.tags) {
        const checkName = obj.data.tags.check || 'unknown';
        if (!checks[checkName]) {
          checks[checkName] = { passed: 0, failed: 0 };
        }
        if (value === 1) checks[checkName].passed++;
        else checks[checkName].failed++;
        summary.total_checks++;
        if (value === 1) summary.passed_checks++;
        else summary.failed_checks++;
      }
    }
  } catch (e) {
    // Ignora linhas inválidas
  }
});

// Calcula estatísticas
function calculateStats(values) {
  if (!values || values.length === 0) return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: (sum / values.length).toFixed(2),
    min: sorted[0].toFixed(2),
    max: sorted[sorted.length - 1].toFixed(2),
    p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
    p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2)
  };
}

const httpDurationStats = calculateStats(summary.http_req_duration.values);
const httpFailRate = summary.http_reqs > 0 ? ((summary.http_req_failed / summary.http_reqs) * 100).toFixed(2) : 0;
const checkSuccessRate = summary.total_checks > 0 ? ((summary.passed_checks / summary.total_checks) * 100).toFixed(2) : 0;

// Gera HTML
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes K6</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .card { background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; }
        .card h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
        .card .value { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .metrics { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #4CAF50; color: white; }
        tr:hover { background: #f5f5f5; }
        .success { color: #4CAF50; }
        .warning { color: #ff9800; }
        .error { color: #f44336; }
        .timestamp { color: #666; font-size: 12px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Relatório de Testes de Performance K6</h1>
        <div class="timestamp">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        
        <h2>📈 Resumo Geral</h2>
        <div class="summary">
            <div class="card">
                <h3>Total de Requisições HTTP</h3>
                <div class="value">${summary.http_reqs.toLocaleString()}</div>
            </div>
            <div class="card">
                <h3>Taxa de Falha HTTP</h3>
                <div class="value ${httpFailRate > 10 ? 'error' : httpFailRate > 5 ? 'warning' : 'success'}">${httpFailRate}%</div>
            </div>
            <div class="card">
                <h3>Taxa de Sucesso dos Checks</h3>
                <div class="value ${checkSuccessRate > 90 ? 'success' : checkSuccessRate > 70 ? 'warning' : 'error'}">${checkSuccessRate}%</div>
            </div>
            <div class="card">
                <h3>Total de Checks</h3>
                <div class="value">${summary.total_checks.toLocaleString()}</div>
            </div>
        </div>

        <h2>⏱️ Performance HTTP</h2>
        <table>
            <thead>
                <tr>
                    <th>Métrica</th>
                    <th>Média</th>
                    <th>Mínimo</th>
                    <th>Máximo</th>
                    <th>P95</th>
                    <th>P99</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Tempo de Resposta (ms)</strong></td>
                    <td>${httpDurationStats.avg}</td>
                    <td>${httpDurationStats.min}</td>
                    <td>${httpDurationStats.max}</td>
                    <td>${httpDurationStats.p95}</td>
                    <td>${httpDurationStats.p99}</td>
                </tr>
            </tbody>
        </table>

        <h2>✅ Checks</h2>
        <table>
            <thead>
                <tr>
                    <th>Check</th>
                    <th>Passou</th>
                    <th>Falhou</th>
                    <th>Taxa de Sucesso</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(checks).map(([name, data]) => {
                  const total = data.passed + data.failed;
                  const rate = total > 0 ? ((data.passed / total) * 100).toFixed(2) : 0;
                  return `<tr>
                    <td>${name}</td>
                    <td class="success">${data.passed}</td>
                    <td class="error">${data.failed}</td>
                    <td class="${rate > 90 ? 'success' : rate > 70 ? 'warning' : 'error'}">${rate}%</td>
                  </tr>`;
                }).join('')}
            </tbody>
        </table>

        <h2>📊 Métricas Personalizadas</h2>
        <table>
            <thead>
                <tr>
                    <th>Métrica</th>
                    <th>Total</th>
                    <th>Média</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(metrics).filter(([name]) => 
                  !['http_reqs', 'http_req_failed', 'http_req_duration', 'checks'].includes(name)
                ).slice(0, 20).map(([name, data]) => {
                  const avg = data.count > 0 ? (data.sum / data.count).toFixed(2) : 0;
                  return `<tr>
                    <td>${name}</td>
                    <td>${data.sum.toLocaleString()}</td>
                    <td>${avg}</td>
                  </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;

fs.writeFileSync('report.html', html, 'utf8');
console.log('✅ Relatório HTML gerado com sucesso: report.html');
console.log(`   - Total de requisições: ${summary.http_reqs.toLocaleString()}`);
console.log(`   - Taxa de falha HTTP: ${httpFailRate}%`);
console.log(`   - Taxa de sucesso dos checks: ${checkSuccessRate}%`);
