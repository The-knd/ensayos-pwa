import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../../shared/api/httpClient';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('11111111-1111-1111-1111-111111111111');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await httpClient.post('/auth/login', { email, password, companyId });
      navigate('/home');
    } catch {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>Iniciar Sesión</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="11111111-1111-1111-1111-111111111111">Empresa Uno</option>
            <option value="22222222-2222-2222-2222-222222222222">Empresa Dos</option>
            <option value="33333333-3333-3333-3333-333333333333">Empresa Tres</option>
          </select>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: 10 }}>
          Ingresar
        </button>
      </form>
    </div>
  );
}