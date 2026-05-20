export default function AdminPage() {
  return (
    <main className="app-shell">
      <div className="app-container">
        <section className="panel">
          <div className="panel-header">
            <strong>관리자 설정</strong>
          </div>
          <div className="panel-body">
            <p className="muted">
              MVP에서는 환경변수로 기준 위치, 예산, API Key를 관리합니다. 상세 설정은 `.env.example`과 Supabase schema를 확인합니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
