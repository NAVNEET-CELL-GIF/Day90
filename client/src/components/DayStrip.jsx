import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const MILESTONE_WEEKS = [4, 8, 12];

function DayDot({ day, index, todayIndex }) {
  const isToday   = day.state === 'today';
  const isDone    = day.state === 'checked_in';
  const isMissed  = day.state === 'missed';
  const isFuture  = day.state === 'future';

  let dotClass = 'day-strip__dot';
  if (isDone)   dotClass += ' day-strip__dot--done';
  if (isToday)  dotClass += ' day-strip__dot--today';
  if (isMissed) dotClass += ' day-strip__dot--missed';
  if (isFuture) dotClass += ' day-strip__dot--future';

  const title = `Day ${day.dayNumber} (${day.date}): ${day.state.replace('_', ' ')}`;

  return (
    <div className="day-strip__cell" title={title} aria-label={title}>
      {day.isMilestone && (
        <div className="day-strip__milestone-tick" aria-label={`Week ${day.milestoneWeek} milestone`} />
      )}
      <motion.div
        className={dotClass}
        initial={isDone ? { scale: 0, opacity: 0 } : false}
        animate={isDone ? { scale: 1, opacity: 1 } : false}
        transition={{
          delay: Math.min(index * 0.006, 0.6),
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      />
      {day.isMilestone && (
        <div className="day-strip__milestone-label">W{day.milestoneWeek}</div>
      )}
    </div>
  );
}

export default function DayStrip({ days, currentDay }) {
  const scrollRef   = useRef(null);
  const todayIndex  = days.findIndex((d) => d.state === 'today' || (d.state === 'checked_in' && d.dayNumber === currentDay));

  // Auto-scroll to today
  useEffect(() => {
    if (scrollRef.current && todayIndex > 0) {
      const cellWidth = 20; // approx
      const scrollTarget = Math.max(0, todayIndex * cellWidth - scrollRef.current.clientWidth / 2);
      scrollRef.current.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }
  }, [todayIndex]);

  return (
    <div className="day-strip" role="img" aria-label={`90-day progress strip. Day ${currentDay} of 90.`}>
      <div className="day-strip__scroll" ref={scrollRef}>
        <div className="day-strip__track">
          {days.map((day, i) => (
            <DayDot key={day.date} day={day} index={i} todayIndex={todayIndex} />
          ))}
        </div>
      </div>

      <div className="day-strip__legend">
        <span className="day-strip__legend-item day-strip__legend-item--done">Used</span>
        <span className="day-strip__legend-item day-strip__legend-item--today">Today</span>
        <span className="day-strip__legend-item day-strip__legend-item--missed">Missed</span>
        <span className="day-strip__legend-item day-strip__legend-item--future">Upcoming</span>
        <span className="day-strip__legend-item day-strip__legend-item--milestone">Milestones (W4, W8, W12)</span>
      </div>

      <style>{`
        .day-strip {
          overflow: hidden;
        }
        .day-strip__scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: var(--space-2);
        }
        .day-strip__scroll::-webkit-scrollbar { display: none; }
        .day-strip__track {
          display: flex;
          gap: 3px;
          padding: var(--space-4) var(--space-2);
          min-width: max-content;
          align-items: flex-end;
        }
        .day-strip__cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          position: relative;
        }
        .day-strip__dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: transform 150ms ease;
        }
        .day-strip__dot--done {
          background: var(--accent);
          box-shadow: 0 1px 4px rgba(196, 105, 42, 0.4);
        }
        .day-strip__dot--today {
          background: transparent;
          border: 2px solid var(--forest);
          box-shadow: 0 0 0 3px rgba(44, 74, 49, 0.15);
          animation: today-pulse 2s ease-in-out infinite;
        }
        @keyframes today-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(44, 74, 49, 0.15); }
          50% { box-shadow: 0 0 0 5px rgba(44, 74, 49, 0.08); }
        }
        .day-strip__dot--missed {
          background: var(--cream-border);
        }
        .day-strip__dot--future {
          background: var(--cream-dark);
          border: 1px dashed var(--cream-border);
        }
        .day-strip__milestone-tick {
          width: 1px;
          height: 8px;
          background: var(--gold);
          opacity: 0.7;
        }
        .day-strip__milestone-label {
          font-size: 8px;
          font-weight: 600;
          color: var(--gold);
          letter-spacing: 0.04em;
          line-height: 1;
          white-space: nowrap;
        }
        .day-strip__legend {
          display: flex;
          gap: var(--space-4);
          flex-wrap: wrap;
          padding: 0 var(--space-2);
          margin-top: var(--space-2);
        }
        .day-strip__legend-item {
          font-size: var(--text-xs);
          color: var(--ink-muted);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .day-strip__legend-item::before {
          content: '';
          display: block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .day-strip__legend-item--done::before   { background: var(--accent); }
        .day-strip__legend-item--missed::before { background: var(--cream-border); }
        .day-strip__legend-item--today::before  { background: transparent; border: 2px solid var(--forest); }
        .day-strip__legend-item--future::before { background: var(--cream-dark); border: 1px dashed var(--cream-border); }
        .day-strip__legend-item--milestone::before { background: var(--gold); border-radius: 1px; width: 3px; height: 10px; }
      `}</style>
    </div>
  );
}
