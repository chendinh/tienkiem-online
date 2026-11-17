'use client';
import { Popover } from '../ds/Popover';
import { Icon } from '../ds/Icon';
import { getAudio, useAudio } from '@/lib/audio';

// The music button in the header: an orb with a tiny equaliser while music plays, and a panel with the track, volume and switches.
// The panel itself (track, volume, switches): used in the header popover and in the Settings window.
export function MusicPanel({ onCredits }: { onCredits: () => void }) {
  const a = useAudio(); const eng = getAudio();
  const pct = Math.round(Math.round(a.vol * 10) * 10); // steps of 10
  return (
    <>
      <div className="pop-head"><b>Nhạc nền</b>
        <label className="tg"><input type="checkbox" checked={a.music} onChange={(e) => eng?.setMusic(e.target.checked)} /><span className="sr-only">Bật nhạc nền</span></label>
      </div>
      {a.track ? (
        <div className="np">
          <div className="np-disc" data-spin={a.playing && a.music ? '1' : '0'}><Icon name="lotus" size={22} /></div>
          <div className="np-meta"><b>{a.track.title}</b><small>{a.track.artist}{a.track.mood ? ` · ${a.track.mood}` : ''}</small></div>
          <div className="np-ctl">
            <button type="button" className="btn icon sm ghost" aria-label="Bài trước" title="Bài trước" onClick={() => eng?.prev()}><Icon name="prev" size={16} /></button>
            <button type="button" className="btn icon sm ghost" aria-label="Bài sau" title="Bài sau" onClick={() => eng?.next()}><Icon name="next" size={16} /></button>
          </div>
        </div>
      ) : <p className="muted pop-note">{a.ready ? '' : 'Chưa có bài nhạc nào. Thêm tệp vào public/audio và khai báo trong playlist.json.'}</p>}
      <div className="vol vol-step" role="group" aria-label="Âm lượng nhạc nền">
        <Icon name="volume" size={17} />
        <button type="button" className="btn icon ghost vol-btn" aria-label="Giảm âm lượng" title="Giảm" disabled={pct <= 0} onClick={() => eng?.setVol((pct - 10) / 100)}>−</button>
        <div className="vol-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <button type="button" className="btn icon ghost vol-btn" aria-label="Tăng âm lượng" title="Tăng" disabled={pct >= 100} onClick={() => eng?.setVol((pct + 10) / 100)}>+</button>
        <span className="num" aria-live="polite">{pct}</span>
      </div>
      <div className="pop-row"><span>Âm thanh giao diện <small>chuông, đàn, sấm</small></span>
        <label className="tg"><input type="checkbox" checked={a.sfx} onChange={(e) => eng?.setSfx(e.target.checked)} /><span className="sr-only">Bật âm thanh giao diện</span></label>
      </div>
      <button type="button" className="link pop-credit" onClick={onCredits}>Ghi công nhạc và tư liệu</button>
    </>
  );
}
export function MusicOrb({ onCredits }: { onCredits: () => void }) {
  const a = useAudio();
  const icon = a.playing && a.music ? <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span> : <Icon name={a.music ? 'music' : 'music-off'} size={19} />;
  return (
    <Popover icon={icon} label="Nhạc nền và âm thanh" active={a.playing && a.music} width={330}>
      <MusicPanel onCredits={onCredits} />
    </Popover>
  );
}
