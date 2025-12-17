export default function TestPage() {
  return (
    <html>
      <body style={{ padding: "40px", backgroundColor: "#f0f0f0", fontFamily: "Arial" }}>
        <h1 style={{ color: "#000", fontSize: "32px" }}>TEST PAGINA</h1>
        <p style={{ color: "#333", fontSize: "18px", marginTop: "20px" }}>
          Als je dit ziet, werkt Next.js basis routing.
        </p>
        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#fff", border: "2px solid #000" }}>
          <p style={{ color: "#000", fontWeight: "bold" }}>Dit is een simpele HTML pagina zonder React componenten.</p>
        </div>
      </body>
    </html>
  );
}
