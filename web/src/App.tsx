// RF-12: de momento solo comprueba que React funciona; las pantallas se pasan una a una.
export function App() {
  return (
    <main className="pantalla">
      <img src="/marca/logo.svg" alt="Rumbo" width={180} />
      <h1 className="titulo">React funcionando</h1>
      <p className="suave">
        Mientras se pasan las pantallas: <a href="/portada-vieja.html">portada</a> · <a href="/viaje.html">recorrido</a> ·{' '}
        <a href="/chat.html">chat</a>
      </p>
    </main>
  );
}
