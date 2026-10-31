import { useState, useMemo } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthMatrix(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Day of week: 0=Sun..6=Sat → shift to Mon=0..Sun=6
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = (startDow + 6) % 7; // Mon=0

  const cells = [];
  // Previous month padding
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, -startDow + i + 1);
    cells.push({ date: d, current: false });
  }
  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  // Next month padding
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      cells.push({ date: new Date(year, month + 1, i), current: false });
    }
  }

  // Split into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function chipClass(category) {
  switch ((category || '').toLowerCase()) {
    case 'events': return 'day-chip day-chip-events';
    case 'academics': return 'day-chip day-chip-academics';
    default: return 'day-chip day-chip-general';
  }
}

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarView({ calendarItems = [], onDaySelect, selectedDay }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const weeks = useMemo(
    () => getMonthMatrix(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  // Build map: dateStr -> items
  const itemsByDay = useMemo(() => {
    const map = {};
    for (const item of calendarItems) {
      if (!item.event_date) continue;
      const key = item.event_date;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [calendarItems]);

  const prevMonth = () =>
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
    );

  const nextMonth = () =>
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
    );

  const goToday = () =>
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));

  const todayStr = toYMD(today);

  return (
    <div className="calendar-grid-card">
      <div className="calendar-nav">
        <span className="calendar-month-label">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <div className="calendar-nav-btns">
          <button className="cal-nav-btn" onClick={prevMonth} title="Previous month">‹</button>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <button className="cal-nav-btn" onClick={nextMonth} title="Next month">›</button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {DAYS.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
      </div>

      <div className="calendar-days">
        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            const dateStr = toYMD(cell.date);
            const items = itemsByDay[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isSelected = selectedDay === dateStr;
            const isCurrentMonth = cell.current;

            return (
              <div
                key={`${wi}-${di}`}
                className={
                  'calendar-day-cell' +
                  (isCurrentMonth ? '' : ' other-month') +
                  (isToday ? ' today' : '') +
                  (isSelected ? ' selected' : '')
                }
                onClick={() => onDaySelect && onDaySelect(dateStr, items)}
              >
                <div className="day-num">{cell.date.getDate()}</div>
                <div className="day-chips">
                  {items.slice(0, 2).map((item) => (
                    <div key={item.id} className={chipClass(item.category)} title={item.title}>
                      {item.event_time
                        ? item.event_time.slice(0, 5) + ' '
                        : ''}
                      {item.title}
                    </div>
                  ))}
                  {items.length > 2 && (
                    <div className="day-chip-more">+{items.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
