import React, { useState, useEffect } from "react";

function App() {
  const [token, setToken] = useState(localStorage.getItem("auth_token") || null);
  const [view, setView] = useState(token ? "catalog" : "auth");
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({ username: "", email: "", password: "", role: "User" });
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    if (token) {
      fetch("http://localhost:4000/api/products")
        .then((res) => res.json())
        .then((data) => setProducts(data))
        .catch(() => setError("Ошибка загрузки каталога"));
    }
  }, [token]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setResponse(null);
    try {
      const endpoint = mode === "login" ? "/api/auth/signin" : "/api/auth/signup";
      const body = mode === "login" ? { username: formData.username, password: formData.password } : formData;
      const res = await fetch(`http://localhost:4000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data);
        setToken(data.token);
        localStorage.setItem("auth_token", data.token);
        setView("catalog");
      } else {
        setError(data.error || "Ошибка запроса");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("auth_token");
    setView("auth");
    setCart([]);
  };

  const addToCart = (product) => setCart((prev) => [...prev, product]);
  const removeFromCart = (index) => setCart((prev) => prev.filter((_, i) => i !== index));

  const placeOrder = async () => {
    setError(null);
    try {
      const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
      const res = await fetch("http://localhost:4000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: cart, total_amount: total }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data);
        setCart([]);
        alert("Заказ успешно оформлен");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  if (!token || view === "auth") {
    return (
      <div style={{ padding: "20px" }}>
        <h2>{mode === "login" ? "Вход" : "Регистрация"}</h2>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ marginBottom: "15px" }}>
          Переключить на {mode === "login" ? "регистрацию" : "вход"}
        </button>
        <form onSubmit={handleAuth}>
          <input name="username" placeholder="Логин" value={formData.username} onChange={handleChange} required />
          <br /><br />
          <input name="password" type="password" placeholder="Пароль" value={formData.password} onChange={handleChange} required />
          <br /><br />
          {mode === "register" && (
            <>
              <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
              <br /><br />
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
              <br /><br />
            </>
          )}
          <button type="submit">{mode === "login" ? "Войти" : "Зарегистрироваться"}</button>
        </form>
        <h3>Ответ сервера:</h3>
        <pre style={{ background: "#f4f4f4", padding: "10px", whiteSpace: "pre-wrap" }}>
          {response ? JSON.stringify(response, null, 2) : "Нет данных"}
        </pre>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>Магазин цветов</h2>
        <div>
          <button onClick={() => setView(view === "catalog" ? "cart" : "catalog")}>
            {view === "catalog" ? `Корзина (${cart.length})` : "Назад в каталог"}
          </button>
          <button onClick={logout} style={{ marginLeft: "10px" }}>Выйти</button>
        </div>
      </header>

      {view === "catalog" && (
        <>
          <h3>Каталог</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" }}>
            {products.map((p) => (
              <div key={p.id} style={{ border: "1px solid #ccc", padding: "10px" }}>
                <h4>{p.name}</h4>
                <p>{p.description}</p>
                <p>Цена: {p.price} руб.</p>
                <button onClick={() => addToCart(p)}>В корзину</button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "cart" && (
        <>
          <h3>Корзина</h3>
          {cart.length === 0 ? <p>Корзина пуста</p> : (
            <>
              <ul>
                {cart.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: "5px" }}>
                    {item.name} - {item.price} руб. 
                    <button onClick={() => removeFromCart(idx)} style={{ marginLeft: "10px" }}>Удалить</button>
                  </li>
                ))}
              </ul>
              <p>Итого: {cart.reduce((s, i) => s + Number(i.price), 0)} руб.</p>
              <button onClick={placeOrder}>Оформить заказ</button>
            </>
          )}
        </>
      )}

      <pre style={{ background: "#f4f4f4", padding: "10px", marginTop: "20px", whiteSpace: "pre-wrap" }}>
        {response ? JSON.stringify(response, null, 2) : "Нет данных"}
      </pre>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default App;