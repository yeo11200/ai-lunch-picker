import type { LunchSession } from '../types/lunch.types';

interface LunchSessionHeaderProps {
  session: LunchSession | null;
  userName: string;
  onChangeUserName: (value: string) => void;
}

export function LunchSessionHeader({ session, userName, onChangeUserName }: LunchSessionHeaderProps) {
  return (
    <>
      <div className="top-bar">
        <div className="title-group">
          <p className="eyebrow">AI Lunch Picker</p>
          <h1 className="page-title">오늘 점심 추천과 투표</h1>
          <p className="page-subtitle">
            네이버 지도 기준 위치 450m 안에서 14,000원 이하 가능성이 높은 후보를 추천하고 11:20에 투표 결과를 공개합니다.
          </p>
        </div>
        <div className="panel" style={{ minWidth: 260 }}>
          <div className="panel-body">
            <label className="metric-label" htmlFor="userName">
              투표자 이름
            </label>
            <input
              id="userName"
              className="input"
              value={userName}
              placeholder="이름 입력"
              onChange={(event) => onChangeUserName(event.target.value)}
            />
          </div>
        </div>
      </div>

      <section className="metrics">
        <div className="metric">
          <p className="metric-label">오늘 날짜</p>
          <p className="metric-value">{session?.sessionDate ?? '-'}</p>
        </div>
        <div className="metric">
          <p className="metric-label">기준 위치</p>
          <p className="metric-value">{session?.basePlaceName ?? '기준 장소'}</p>
        </div>
        <div className="metric">
          <p className="metric-label">검색 반경</p>
          <p className="metric-value">{session?.radiusMeters ?? 450}m</p>
        </div>
        <div className="metric">
          <p className="metric-label">예산</p>
          <p className="metric-value">{(session?.maxPrice ?? 14000).toLocaleString('ko-KR')}원</p>
        </div>
      </section>
    </>
  );
}
