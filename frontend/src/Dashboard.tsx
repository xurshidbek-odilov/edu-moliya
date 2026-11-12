import { useEffect, useState } from "react";
import "./dashboard.css";

type Data = {
  students: number;
  teachers: number;
  groups: number;
  finance: {
    revenue: number;
    expenses: number;
    profit: number;
    inflow: number;
    outflow: number;
    cash: number;
    bank: number;
  };
  current: { debt: number; advances: number; debtors: number; payable: number };
  daily: { day: number; inflow: number; outflow: number }[];
  debtors: {
    _id: string;
    firstName: string;
    lastName: string;
    balance: number;
  }[];
  lessons: {
    total: number;
    completed: number;
    scheduled: {
      _id: string;
      date: string;
      time: string;
      group?: { name: string };
      teacher?: { firstName: string; lastName: string };
    }[];
  };
  recent: {
    id: string;
    date: string;
    type: string;
    description: string;
    amount: number;
  }[];
};
const money = (n: number) => `${n.toLocaleString("uz-UZ")} so‘m`;
const names: Record<string, string> = {
  student_payment: "O‘quvchidan to‘lov",
  teacher_salary: "Maosh to‘lovi",
  expense: "Xarajat",
  investor_capital: "Investor kapitali",
  loan_received: "Kredit olindi",
  salary_accrual: "Ish haqi hisoblandi",
  lesson_completed: "Dars o‘tildi",
};
const months = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];
const dateLabel = (value: string) => {
  const date = new Date(value);
  return `${date.getUTCDate()}-${months[date.getUTCMonth()]}`;
};

export function DashboardOverview() {
  const [month, setMonth] = useState(() =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
    }).format(new Date()),
  );
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    fetch(
      `${import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"}/dashboard?month=${month}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Sessiya tugagan. Qayta tizimga kiring."
              : "Dashboard ma’lumotlarini olishda xatolik.",
          );
        return response.json();
      })
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, refresh]);
  const card = (label: string, value: string, note: string, tone = "") => (
    <article className={`dash-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
  const maxFlow = Math.max(
    1,
    ...(data?.daily.map((d) => Math.max(d.inflow, d.outflow)) ?? []),
  );
  return (
    <div className="dash">
      <header className="page-title">
        <div>
          <h1>Dashboard</h1>
          <p>O‘quv markazi faoliyati va moliyaviy holati</p>
        </div>
        <div className="dash-controls">
          <label>
            Hisobot oyi
            <input
              type="month"
              required
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <button
            className="cancel"
            disabled={loading}
            onClick={() => setRefresh((n) => n + 1)}
          >
            Yangilash
          </button>
        </div>
      </header>
      {loading && (
        <p role="status" className="dash-empty">
          Ma’lumotlar yuklanmoqda…
        </p>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {data && (
        <>
          <div className="dash-counts">
            <span>
              O‘quvchilar <b>{data.students}</b>
            </span>
            <span>
              O‘qituvchilar <b>{data.teachers}</b>
            </span>
            <span>
              Guruhlar <b>{data.groups}</b>
            </span>
            <span>
              Qarzdor o‘quvchilar <b>{data.current.debtors}</b>
            </span>
          </div>
          <h2>Tanlangan oy moliyasi</h2>
          <div className="dash-grid">
            {card(
              "Daromad",
              money(data.finance.revenue),
              "Hisoblangan dars daromadi",
              "positive",
            )}
            {card(
              "Xarajatlar",
              money(data.finance.expenses),
              "Hisoblangan maosh va xarajatlar",
            )}
            {card(
              "Sof foyda",
              money(data.finance.profit),
              "Daromad − xarajatlar",
              data.finance.profit < 0 ? "negative" : "positive",
            )}
            {card(
              "Pul o‘zgarishi",
              money(data.finance.inflow - data.finance.outflow),
              "Kirim − chiqim",
            )}
          </div>
          <div className="dash-grid dash-balances">
            {card(
              "Naqd kassa",
              money(data.finance.cash),
              "Tanlangan oy oxiriga",
            )}
            {card(
              "Bank hisobi",
              money(data.finance.bank),
              "Tanlangan oy oxiriga",
            )}
            {card(
              "Jami kirim",
              money(data.finance.inflow),
              "Oy davomida tushgan pul",
            )}
            {card(
              "Jami chiqim",
              money(data.finance.outflow),
              "Oy davomida to‘langan pul",
            )}
          </div>
          <div className="dash-columns">
            <section className="dash-panel">
              <h2>Kunlik pul harakati</h2>
              <p className="dash-legend">
                <span>Kirim</span>
                <span>Chiqim</span>
              </p>
              {data.daily.some((d) => d.inflow || d.outflow) ? (
                <div
                  className="dash-chart"
                  aria-label="Kunlar bo‘yicha kirim va chiqim"
                >
                  {data.daily.map((d) => (
                    <div
                      className="dash-day"
                      key={d.day}
                      title={`${d.day}-kun: kirim ${money(d.inflow)}, chiqim ${money(d.outflow)}`}
                    >
                      <div className="dash-bars">
                        <i
                          style={{ height: `${(d.inflow / maxFlow) * 100}%` }}
                        />
                        <i
                          style={{ height: `${(d.outflow / maxFlow) * 100}%` }}
                        />
                      </div>
                      <small>{d.day}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dash-empty">Bu oyda pul harakati yo‘q.</p>
              )}
            </section>
            <section className="dash-panel">
              <h2>Darslar holati</h2>
              <p>Bazaga shakllantirilgan oylik jadval</p>
              <div className="dash-lesson-count">
                <strong>{data.lessons.completed}</strong>
                <span>/ {data.lessons.total} ta dars o‘tilgan</span>
              </div>
              <progress
                max={data.lessons.total || 1}
                value={data.lessons.completed}
                aria-label="O‘tilgan darslar"
              />
              <p>
                Rejada: <b>{data.lessons.total - data.lessons.completed}</b>
              </p>
              {data.lessons.total === 0 && (
                <p className="dash-empty">
                  Jadvalni shakllantirish uchun Darslar bo‘limida shu oyni
                  oching.
                </p>
              )}
            </section>
          </div>
          <h2>Joriy qarzdorlik va avanslar</h2>
          <p className="dash-hint">
            Quyidagi balanslar hozirgi holatni ko‘rsatadi; oy filtriga bog‘liq
            emas.
          </p>
          <div className="dash-grid">
            {card(
              "O‘quvchilar qarzi",
              money(data.current.debt),
              `${data.current.debtors} nafar qarzdor`,
              "negative",
            )}
            {card(
              "O‘quvchilar avansi",
              money(data.current.advances),
              "Oldindan to‘langan mablag‘",
            )}
            {card(
              "O‘qituvchilarga qarz",
              money(data.current.payable),
              "Hisoblangan, hali to‘lanmagan maosh",
            )}
          </div>
          <div className="dash-columns">
            <section className="dash-panel">
              <h2>Eng ko‘p qarzdor o‘quvchilar</h2>
              {data.debtors.length ? (
                <ul className="dash-list">
                  {data.debtors.map((s) => (
                    <li key={s._id}>
                      <span>
                        {s.firstName} {s.lastName}
                      </span>
                      <b className="negative-value">{money(-s.balance)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dash-empty">Qarzdor o‘quvchilar yo‘q.</p>
              )}
            </section>
            <section className="dash-panel">
              <h2>O‘tilmagan darslar</h2>
              {data.lessons.scheduled.length ? (
                <ul className="dash-list">
                  {data.lessons.scheduled.map((l) => (
                    <li key={l._id}>
                      <span>
                        <b>{l.group?.name ?? "Guruh o‘chirilgan"}</b>
                        <small>
                          {l.teacher
                            ? `${l.teacher.firstName} ${l.teacher.lastName}`
                            : "O‘qituvchi ko‘rsatilmagan"}
                        </small>
                      </span>
                      <span>
                        {dateLabel(l.date)}
                        <small>{l.time}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dash-empty">Bu oyda o‘tilmagan darslar yo‘q.</p>
              )}
            </section>
          </div>
          <section className="dash-panel">
            <h2>Oydagi oxirgi moliyaviy hodisalar</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Hodisa</th>
                    <th>Izoh</th>
                    <th>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr key={row.id}>
                      <td>{dateLabel(row.date)}</td>
                      <td>{names[row.type] ?? row.type}</td>
                      <td>
                        {row.description === row.type ? "—" : row.description}
                      </td>
                      <td>{money(row.amount)}</td>
                    </tr>
                  ))}
                  {!data.recent.length && (
                    <tr>
                      <td colSpan={4}>Tanlangan oyda hodisalar yo‘q.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="dash-hint">
              Dars va ish haqi hisoblanishi pul harakati bo‘lmasligi mumkin.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
