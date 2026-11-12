import { useEffect, useState } from "react";
import { DashboardOverview } from "./Dashboard";
import type { FormEvent, ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
type Page =
  | "dashboard"
  | "teachers"
  | "students"
  | "groups"
  | "lessons"
  | "cash"
  | "finance"
  | "reports"
  | "expenses";
type Teacher = {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  salaryPercentage: number;
  balance: number;
};
type Student = {
  discountPercentage: number;
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  balance: number;
  group?: { _id: string; name: string } | null;
};
type Group = {
  _id: string;
  name: string;
  time: string;
  coursePrice: number;
  lessonsPerMonth: number;
  teacher: Teacher;
  weekdays: string[];
  students: Student[];
};
type Expense = { _id: string; name: string; description: string };
type Lesson = {
  _id: string;
  date: string;
  time: string;
  status: "scheduled" | "completed";
  group: { _id: string; name: string };
  teacher: Teacher;
};
type PaymentMethod = "cash" | "card" | "payme" | "click" | "bank_transfer";
type CashTransaction = {
  _id: string;
  type: "student_payment" | "teacher_salary" | "expense";
  amount: number;
  paymentMethod: PaymentMethod;
  comment: string;
  date: string;
  student?: Pick<Student, "_id" | "firstName" | "lastName">;
  teacher?: Pick<Teacher, "_id" | "firstName" | "lastName">;
  expenseCategory?: Pick<Expense, "_id" | "name">;
};
type FinanceEvent = {
  _id: string;
  type:
    "investor_capital" | "loan_received" | "salary_accrual" | "cash_transfer";
  date: string;
  amount: number;
  paymentMethod: "cash" | "bank_transfer";
  investorName: string;
  annualInterestRate: number;
  comment: string;
  teacher?: Pick<Teacher, "_id" | "firstName" | "lastName">;
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...options?.headers,
    },
  });
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.reload();
  }
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.message ?? "Amal bajarilmadi");
  return data;
}

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  if (!token)
    return (
      <Login
        onLogin={(value) => {
          localStorage.setItem("token", value);
          setToken(value);
        }}
      />
    );
  return (
    <Layout
      onLogout={() => {
        localStorage.removeItem("token");
        setToken(null);
      }}
    />
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(data.token);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">EduTizim.uz</span>
        <h1>Admin panel</h1>
        <p>Tizimga kirish uchun ma’lumotlaringizni kiriting.</p>
        <label>
          Login
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Parol
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button>Kirish</button>
      </form>
    </main>
  );
}

function Layout({ onLogout }: { onLogout: () => void }) {
  const [page, setPage] = useState<Page>("dashboard");
  const nav: [Page, string][] = [
    ["dashboard", "Dashboard"],
    ["teachers", "O‘qituvchilar"],
    ["students", "O‘quvchilar"],
    ["groups", "Guruhlar"],
    ["lessons", "Darslar"],
    ["cash", "Kassa"],
    ["finance", "Moliyaviy hodisalar"],
    ["reports", "Hisobotlar"],
    ["expenses", "Xarajat asoslari"],
  ];
  return (
    <div className="app-shell">
      <aside>
        <div className="brand">
          EduTizim<span>Moliya CRM</span>
        </div>
        <nav>
          {nav.map(([key, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={onLogout}>
          Chiqish
        </button>
      </aside>
      <main className="content">
        {page === "dashboard" && <DashboardOverview />}
        {page === "teachers" && <Teachers />}
        {page === "students" && <Students />}
        {page === "groups" && <Groups />}
        {page === "lessons" && <Lessons />}
        {page === "cash" && <Cash />}
        {page === "finance" && <FinanceEvents />}
        {page === "reports" && <Reports />}
        {page === "expenses" && <Expenses />}
      </main>
    </div>
  );
}

function Title({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
function Notice({ value }: { value: string }) {
  return value ? <div className="error">{value}</div> : null;
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Dashboard() {
  const [data, setData] = useState({
    teachers: 0,
    students: 0,
    groups: 0,
    expenseCategories: 0,
  });
  useEffect(() => {
    api<typeof data>("/dashboard").then(setData);
  }, []);
  return (
    <>
      <Title
        title="Dashboard"
        subtitle="O‘quv markazining umumiy ko‘rsatkichlari"
      />
      <div className="stats">
        <Stat label="O‘qituvchilar" value={data.teachers} />
        <Stat label="O‘quvchilar" value={data.students} />
        <Stat label="Guruhlar" value={data.groups} />
        <Stat label="Xarajat asoslari" value={data.expenseCategories} />
      </div>
    </>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Teachers() {
  const empty = {
    firstName: "",
    lastName: "",
    phone: "",
    salaryPercentage: 50,
  };
  const [form, setForm] = useState(empty);
  const [items, setItems] = useState<Teacher[]>([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const load = () => api<Teacher[]>("/teachers").then(setItems);
  useEffect(() => {
    load();
  }, []);
  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(empty);
  }
  function create() {
    setEditingId(null);
    setForm(empty);
    setModalOpen(true);
  }
  function edit(item: Teacher) {
    setEditingId(item._id);
    setForm({
      firstName: item.firstName,
      lastName: item.lastName,
      phone: item.phone,
      salaryPercentage: item.salaryPercentage,
    });
    setModalOpen(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api(editingId ? `/teachers/${editingId}` : "/teachers", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      closeModal();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: string) {
    try {
      await api(`/teachers/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <>
      <Title
        title="O‘qituvchilar"
        subtitle="O‘qituvchilar va ularning maosh foizi"
        action={<button onClick={create}>+ O‘qituvchi qo‘shish</button>}
      />
      <Notice value={error} />
      {modalOpen && (
        <Modal
          title={editingId ? "O‘qituvchini o‘zgartirish" : "Yangi o‘qituvchi"}
          onClose={closeModal}
        >
          <form className="modal-form" onSubmit={submit}>
            <label>
              Ism
              <input
                placeholder="Ism"
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </label>
            <label>
              Familiya
              <input
                placeholder="Familiya"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
            <label>
              Telefon
              <input
                placeholder="Telefon"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              Maosh foizi
              <input
                type="number"
                min="0"
                max="100"
                required
                value={form.salaryPercentage}
                onChange={(e) =>
                  setForm({ ...form, salaryPercentage: Number(e.target.value) })
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeModal}>
                Bekor qilish
              </button>
              <button>{editingId ? "Saqlash" : "Qo‘shish"}</button>
            </div>
          </form>
        </Modal>
      )}
      <Table heads={["Ism", "Familiya", "Telefon", "Maosh foizi", ""]}>
        {items.map((x) => (
          <tr key={x._id}>
            <td>{x.firstName}</td>
            <td>{x.lastName}</td>
            <td>{x.phone}</td>
            <td>{x.salaryPercentage}%</td>
            <td>
              <div className="row-actions">
                <button className="edit" onClick={() => edit(x)}>
                  O‘zgartirish
                </button>
                <button className="danger" onClick={() => remove(x._id)}>
                  O‘chirish
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function Students() {
  const empty = {
    firstName: "",
    lastName: "",
    phone: "",
    group: "",
    discountPercentage: 0,
  };
  const [form, setForm] = useState(empty);
  const [items, setItems] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [balanceFilter, setBalanceFilter] = useState<"all" | "debt" | "credit">(
    "all",
  );
  const [groupFilter, setGroupFilter] = useState("");
  const load = () =>
    Promise.all([api<Student[]>("/students"), api<Group[]>("/groups")]).then(
      ([s, g]) => {
        setItems(s);
        setGroups(g);
      },
    );
  useEffect(() => {
    load();
  }, []);
  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(empty);
  }
  function create() {
    setEditingId(null);
    setForm(empty);
    setModalOpen(true);
  }
  function edit(item: Student) {
    setEditingId(item._id);
    setForm({
      firstName: item.firstName,
      lastName: item.lastName,
      phone: item.phone,
      group: item.group?._id ?? "",
      discountPercentage: item.discountPercentage ?? 0,
    });
    setModalOpen(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api(editingId ? `/students/${editingId}` : "/students", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      closeModal();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: string) {
    await api(`/students/${id}`, { method: "DELETE" });
    load();
  }
  const filteredItems = items.filter(
    (student) =>
      (balanceFilter === "all" ||
        (balanceFilter === "debt"
          ? (student.balance ?? 0) < 0
          : (student.balance ?? 0) > 0)) &&
      (!groupFilter || student.group?._id === groupFilter),
  );
  const money = (value: number) =>
    `${(value ?? 0).toLocaleString("uz-UZ")} so‘m`;
  return (
    <>
      <Title
        title="O‘quvchilar"
        subtitle="O‘quvchilar va biriktirilgan guruhlar"
        action={<button onClick={create}>+ O‘quvchi qo‘shish</button>}
      />
      <Notice value={error} />
      {modalOpen && (
        <Modal
          title={editingId ? "O‘quvchini o‘zgartirish" : "Yangi o‘quvchi"}
          onClose={closeModal}
        >
          <form className="modal-form" onSubmit={submit}>
            <label>
              Ism
              <input
                placeholder="Ism"
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </label>
            <label>
              Familiya
              <input
                placeholder="Familiya"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
            <label>
              Telefon
              <input
                placeholder="Telefon"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              Chegirma (%)
              <input
                type="number"
                min="0"
                max="100"
                value={form.discountPercentage}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountPercentage: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Guruh
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
              >
                <option value="">Guruhsiz</option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeModal}>
                Bekor qilish
              </button>
              <button>{editingId ? "Saqlash" : "Qo‘shish"}</button>
            </div>
          </form>
        </Modal>
      )}
      <div className="student-filters">
        <label>
          Balans holati
          <select
            value={balanceFilter}
            onChange={(e) =>
              setBalanceFilter(e.target.value as "all" | "debt" | "credit")
            }
          >
            <option value="all">Barcha o‘quvchilar</option>
            <option value="debt">Qarzdorlar</option>
            <option value="credit">Haqdorlar</option>
          </select>
        </label>
        <label>
          Guruh
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">Barcha guruhlar</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <span>{filteredItems.length} ta o‘quvchi</span>
      </div>
      <Table heads={["Ism", "Familiya", "Guruh", "Telefon", "Balans", ""]}>
        {filteredItems.map((x) => (
          <tr key={x._id}>
            <td>{x.firstName}</td>
            <td>{x.lastName}</td>
            <td>{x.group?.name ?? "—"}</td>
            <td>{x.phone}</td>
            <td>
              <span
                className={`student-balance ${(x.balance ?? 0) < 0 ? "debt" : (x.balance ?? 0) > 0 ? "credit" : "zero"}`}
              >
                {money(x.balance ?? 0)}
              </span>
            </td>
            <td>
              <div className="row-actions">
                <button className="edit" onClick={() => edit(x)}>
                  O‘zgartirish
                </button>
                <button className="danger" onClick={() => remove(x._id)}>
                  O‘chirish
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

const dayOptions = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];
const uzWeekdays = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
];
const uzMonths = [
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
function formatUzDate(value: string) {
  const date = new Date(value);
  return `${date.getUTCDate()}-${uzMonths[date.getUTCMonth()]}, ${uzWeekdays[date.getUTCDay()]}`;
}
function Groups() {
  const blank = {
    name: "",
    time: "",
    coursePrice: 0,
    lessonsPerMonth: 12,
    teacher: "",
    weekdays: [] as string[],
    students: [] as string[],
  };
  const [form, setForm] = useState(blank);
  const [items, setItems] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const load = () =>
    Promise.all([
      api<Group[]>("/groups"),
      api<Teacher[]>("/teachers"),
      api<Student[]>("/students"),
    ]).then(([g, t, s]) => {
      setItems(g);
      setTeachers(t);
      setStudents(s);
    });
  useEffect(() => {
    load();
  }, []);
  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(blank);
  }
  function openCreate() {
    setEditingId(null);
    setForm(blank);
    setModalOpen(true);
  }
  function openEdit(group: Group) {
    setEditingId(group._id);
    setForm({
      name: group.name,
      time: group.time,
      coursePrice: group.coursePrice ?? 0,
      lessonsPerMonth: group.lessonsPerMonth,
      teacher: group.teacher._id,
      weekdays: group.weekdays,
      students: group.students.map((student) => student._id),
    });
    setModalOpen(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api(editingId ? `/groups/${editingId}` : "/groups", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      closeModal();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function toggleDay(day: string) {
    setForm({
      ...form,
      weekdays: form.weekdays.includes(day)
        ? form.weekdays.filter((x) => x !== day)
        : [...form.weekdays, day],
    });
  }
  async function remove(id: string) {
    await api(`/groups/${id}`, { method: "DELETE" });
    load();
  }
  return (
    <>
      <Title
        title="Guruhlar"
        subtitle="Dars jadvali, o‘qituvchi va o‘quvchilar"
        action={<button onClick={openCreate}>+ Guruh qo‘shish</button>}
      />
      <Notice value={error} />
      {modalOpen && (
        <Modal
          title={editingId ? "Guruhni o‘zgartirish" : "Yangi guruh"}
          onClose={closeModal}
        >
          <form className="group-form modal-form" onSubmit={submit}>
            <div className="form-grid">
              <label>
                Guruh nomi
                <input
                  placeholder="Masalan: English A1"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Dars vaqti
                <input
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </label>
              <label>
                Kurs narxi (so‘m)
                <input
                  type="number"
                  min="0"
                  placeholder="Masalan: 600000"
                  required
                  value={form.coursePrice}
                  onChange={(e) =>
                    setForm({ ...form, coursePrice: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Bir oydagi darslar soni
                <input
                  type="number"
                  min="1"
                  placeholder="Masalan: 12"
                  required
                  value={form.lessonsPerMonth}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lessonsPerMonth: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                O‘qituvchi
                <select
                  required
                  value={form.teacher}
                  onChange={(e) =>
                    setForm({ ...form, teacher: e.target.value })
                  }
                >
                  <option value="">O‘qituvchini tanlang</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Hafta kunlari
              <div className="checks">
                {dayOptions.map((d) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      checked={form.weekdays.includes(d)}
                      onChange={() => toggleDay(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </label>
            <label>
              O‘quvchilar
              <select
                multiple
                value={form.students}
                onChange={(e) =>
                  setForm({
                    ...form,
                    students: Array.from(
                      e.target.selectedOptions,
                      (o) => o.value,
                    ),
                  })
                }
              >
                {students.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeModal}>
                Bekor qilish
              </button>
              <button>{editingId ? "Saqlash" : "Guruh yaratish"}</button>
            </div>
          </form>
        </Modal>
      )}
      <Table heads={["Guruh nomi", "O‘qituvchi", "O‘quvchilar soni", ""]}>
        {items.map((g) => (
          <tr key={g._id}>
            <td>
              <b>{g.name}</b>
            </td>
            <td>
              {g.teacher?.firstName} {g.teacher?.lastName}
            </td>
            <td>{g.students.length} nafar</td>
            <td>
              <div className="row-actions">
                <button className="edit" onClick={() => openEdit(g)}>
                  O‘zgartirish
                </button>
                <button className="danger" onClick={() => remove(g._id)}>
                  O‘chirish
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function Lessons() {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [items, setItems] = useState<Lesson[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    api<Lesson[]>(`/lessons?month=${month}`)
      .then(setItems)
      .catch((err) => setError((err as Error).message));
  useEffect(() => {
    load();
  }, [month]);
  async function complete(id: string) {
    try {
      await api(`/lessons/${id}/complete`, { method: "PATCH" });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <>
      <Title
        title="Darslar"
        subtitle="Guruh jadvalidan avtomatik shakllantirilgan oylik darslar"
        action={
          <input
            className="month-picker"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        }
      />
      <Notice value={error} />
      <div className="lesson-summary">
        Bu oyda <b>{items.length} ta dars</b> bor · O‘tilgan:{" "}
        <b>{items.filter((x) => x.status === "completed").length}</b>
      </div>
      <Table heads={["Sana", "Vaqt", "Guruh", "O‘qituvchi", "Holati", ""]}>
        {items.map((lesson) => (
          <tr key={lesson._id}>
            <td>{formatUzDate(lesson.date)}</td>
            <td>{lesson.time}</td>
            <td>
              <b>{lesson.group?.name}</b>
            </td>
            <td>
              {lesson.teacher?.firstName} {lesson.teacher?.lastName}
            </td>
            <td>
              <span className={`lesson-status ${lesson.status}`}>
                {lesson.status === "completed" ? "O‘tildi" : "Rejada"}
              </span>
            </td>
            <td>
              {lesson.status === "scheduled" ? (
                <button
                  className="complete"
                  onClick={() => complete(lesson._id)}
                >
                  O‘tildi deb belgilash
                </button>
              ) : (
                "✓"
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function Cash() {
  type CashTab = "teacher" | "student" | "expense";
  const defaultMethod: PaymentMethod = "cash";
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<CashTab>("teacher");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [account, setAccount] = useState({
    earnedProfit: 0,
    cashBalance: 0,
    cashOnHand: 0,
    bankBalance: 0,
  });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<{
    teacherId: string;
    amount: number;
    comment: string;
    paymentMethod: PaymentMethod;
    date: string;
  }>({
    teacherId: "",
    amount: 0,
    comment: "",
    paymentMethod: defaultMethod,
    date: today,
  });
  const [studentForm, setStudentForm] = useState<{
    studentId: string;
    amount: number;
    comment: string;
    paymentMethod: PaymentMethod;
    date: string;
  }>({
    studentId: "",
    amount: 0,
    comment: "",
    paymentMethod: defaultMethod,
    date: today,
  });
  const [expenseForm, setExpenseForm] = useState<{
    expenseCategoryId: string;
    amount: number;
    comment: string;
    paymentMethod: PaymentMethod;
    date: string;
  }>({
    expenseCategoryId: "",
    amount: 0,
    comment: "",
    paymentMethod: defaultMethod,
    date: today,
  });
  const money = (value: number) =>
    `${(value ?? 0).toLocaleString("uz-UZ")} so‘m`;
  const load = () =>
    Promise.all([
      api<Teacher[]>("/teachers"),
      api<Student[]>("/students"),
      api<Expense[]>("/expense-categories"),
      api<{
        transactions: CashTransaction[];
        account: {
          earnedProfit: number;
          cashBalance: number;
          cashOnHand: number;
          bankBalance: number;
        };
      }>("/cash"),
    ]).then(([t, s, e, cash]) => {
      setTeachers(t);
      setStudents(s);
      setExpenses(e);
      setTransactions(cash.transactions);
      setAccount(cash.account);
    });
  useEffect(() => {
    load();
  }, []);
  const selectedTeacher = teachers.find((x) => x._id === teacherForm.teacherId);
  const selectedStudent = students.find((x) => x._id === studentForm.studentId);
  async function send(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (tab === "teacher") {
        await api(editingId ? `/cash/${editingId}` : "/cash/teacher-salary", {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(teacherForm),
        });
        setTeacherForm({
          teacherId: "",
          amount: 0,
          comment: "",
          paymentMethod: defaultMethod,
          date: today,
        });
      } else if (tab === "student") {
        await api(editingId ? `/cash/${editingId}` : "/cash/student-payment", {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(studentForm),
        });
        setStudentForm({
          studentId: "",
          amount: 0,
          comment: "",
          paymentMethod: defaultMethod,
          date: today,
        });
      } else {
        await api(editingId ? `/cash/${editingId}` : "/cash/expense", {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(expenseForm),
        });
        setExpenseForm({
          expenseCategoryId: "",
          amount: 0,
          comment: "",
          paymentMethod: defaultMethod,
          date: today,
        });
      }
      setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const transactionName = (item: CashTransaction) =>
    item.type === "teacher_salary"
      ? `${item.teacher?.firstName ?? ""} ${item.teacher?.lastName ?? ""}`
      : item.type === "student_payment"
        ? `${item.student?.firstName ?? ""} ${item.student?.lastName ?? ""}`
        : (item.expenseCategory?.name ?? "Xarajat");
  const transactionType = (type: CashTransaction["type"]) =>
    ({
      teacher_salary: "O‘qituvchiga maosh",
      student_payment: "O‘quvchidan to‘lov",
      expense: "Xarajat",
    })[type];
  function editTransaction(item: CashTransaction) {
    setEditingId(item._id);
    const common = {
      amount: item.amount,
      comment: item.comment,
      paymentMethod: item.paymentMethod ?? defaultMethod,
      date: item.date.slice(0, 10),
    };
    if (item.type === "teacher_salary") {
      setTab("teacher");
      setTeacherForm({ teacherId: item.teacher?._id ?? "", ...common });
    } else if (item.type === "student_payment") {
      setTab("student");
      setStudentForm({ studentId: item.student?._id ?? "", ...common });
    } else {
      setTab("expense");
      setExpenseForm({
        expenseCategoryId: item.expenseCategory?._id ?? "",
        ...common,
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditingId(null);
    setTeacherForm({
      teacherId: "",
      amount: 0,
      comment: "",
      paymentMethod: defaultMethod,
      date: today,
    });
    setStudentForm({
      studentId: "",
      amount: 0,
      comment: "",
      paymentMethod: defaultMethod,
      date: today,
    });
    setExpenseForm({
      expenseCategoryId: "",
      amount: 0,
      comment: "",
      paymentMethod: defaultMethod,
      date: today,
    });
  }
  const methodName = (method?: PaymentMethod) =>
    ({
      cash: "Naqd",
      card: "Plastik karta",
      payme: "Payme",
      click: "Click",
      bank_transfer: "Bank o‘tkazmasi",
    })[method ?? "cash"];
  const paymentOptions = (
    <>
      <option value="cash">Naqd</option>
      <option value="card">Plastik karta</option>
      <option value="payme">Payme</option>
      <option value="click">Click</option>
      <option value="bank_transfer">Bank o‘tkazmasi</option>
    </>
  );
  return (
    <>
      <Title title="Kassa" subtitle="Kirim, maosh va xarajat operatsiyalari" />
      <div className="cash-stats">
        <article className="stat">
          <span>Naqd kassa</span>
          <strong>{money(account.cashOnHand)}</strong>
        </article>
        <article className="stat">
          <span>Bank hisobi</span>
          <strong>{money(account.bankBalance)}</strong>
        </article>
        <article className="stat">
          <span>Jami pul</span>
          <strong>{money(account.cashBalance)}</strong>
        </article>
        <article className="stat">
          <span>Markaz foydasi</span>
          <strong>{money(account.earnedProfit)}</strong>
        </article>
      </div>
      <div className="cash-tabs">
        <button
          className={tab === "teacher" ? "active" : ""}
          onClick={() => {
            setTab("teacher");
            cancelEdit();
          }}
        >
          O‘qituvchiga maosh
        </button>
        <button
          className={tab === "student" ? "active" : ""}
          onClick={() => {
            setTab("student");
            cancelEdit();
          }}
        >
          O‘quvchidan to‘lov
        </button>
        <button
          className={tab === "expense" ? "active" : ""}
          onClick={() => {
            setTab("expense");
            cancelEdit();
          }}
        >
          Xarajatlar
        </button>
      </div>
      <Notice value={error} />
      {editingId && (
        <div className="editing-notice">Operatsiya tahrirlanmoqda</div>
      )}
      <form className="cash-form" onSubmit={send}>
        {tab === "teacher" && (
          <>
            <label>
              O‘qituvchi
              <select
                required
                value={teacherForm.teacherId}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, teacherId: e.target.value })
                }
              >
                <option value="">O‘qituvchini tanlang</option>
                {teachers.map((x) => (
                  <option key={x._id} value={x._id}>
                    {x.firstName} {x.lastName}
                  </option>
                ))}
              </select>
            </label>
            <div
              className={`balance-box ${(selectedTeacher?.balance ?? 0) < 0 ? "negative" : ""}`}
            >
              <span>O‘qituvchi balansi (markaz qarzdorligi)</span>
              <b>{money(selectedTeacher?.balance ?? 0)}</b>
            </div>
            <label>
              To‘lov sanasi
              <input
                type="date"
                required
                value={teacherForm.date}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, date: e.target.value })
                }
              />
            </label>
            <label>
              Beriladigan summa
              <input
                type="number"
                min="1"
                required
                value={teacherForm.amount || ""}
                onChange={(e) =>
                  setTeacherForm({
                    ...teacherForm,
                    amount: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              To‘lov turi
              <select
                value={teacherForm.paymentMethod}
                onChange={(e) =>
                  setTeacherForm({
                    ...teacherForm,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
              >
                {paymentOptions}
              </select>
            </label>
            <label>
              Kommentariya
              <textarea
                value={teacherForm.comment}
                onChange={(e) =>
                  setTeacherForm({ ...teacherForm, comment: e.target.value })
                }
              />
            </label>
          </>
        )}
        {tab === "student" && (
          <>
            <label>
              O‘quvchi
              <select
                required
                value={studentForm.studentId}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, studentId: e.target.value })
                }
              >
                <option value="">O‘quvchini tanlang</option>
                {students.map((x) => (
                  <option key={x._id} value={x._id}>
                    {x.firstName} {x.lastName}
                  </option>
                ))}
              </select>
            </label>
            <div
              className={`balance-box ${(selectedStudent?.balance ?? 0) < 0 ? "negative" : ""}`}
            >
              <span>O‘quvchi balansi</span>
              <b>{money(selectedStudent?.balance ?? 0)}</b>
            </div>
            <label>
              To‘lov sanasi
              <input
                type="date"
                required
                value={studentForm.date}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, date: e.target.value })
                }
              />
            </label>
            <label>
              To‘lov summasi
              <input
                type="number"
                min="1"
                required
                value={studentForm.amount || ""}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    amount: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              To‘lov turi
              <select
                value={studentForm.paymentMethod}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
              >
                {paymentOptions}
              </select>
            </label>
            <label>
              Kommentariya
              <textarea
                value={studentForm.comment}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, comment: e.target.value })
                }
              />
            </label>
          </>
        )}
        {tab === "expense" && (
          <>
            <label>
              Xarajat sanasi
              <input
                type="date"
                required
                value={expenseForm.date}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, date: e.target.value })
                }
              />
            </label>
            <label>
              Xarajat asosi
              <select
                required
                value={expenseForm.expenseCategoryId}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    expenseCategoryId: e.target.value,
                  })
                }
              >
                <option value="">Xarajat asosini tanlang</option>
                {expenses.map((x) => (
                  <option key={x._id} value={x._id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Xarajat summasi
              <input
                type="number"
                min="1"
                required
                value={expenseForm.amount || ""}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    amount: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              To‘lov turi
              <select
                value={expenseForm.paymentMethod}
                onChange={(e) =>
                  setExpenseForm({
                    ...expenseForm,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
              >
                {paymentOptions}
              </select>
            </label>
            <label>
              Kommentariya
              <textarea
                value={expenseForm.comment}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, comment: e.target.value })
                }
              />
            </label>
          </>
        )}
        <div className="row-actions">
          {editingId && (
            <button type="button" className="cancel" onClick={cancelEdit}>
              Bekor qilish
            </button>
          )}
          <button>{editingId ? "O‘zgarishni saqlash" : "Saqlash"}</button>
        </div>
      </form>
      <h2 className="section-title">Oxirgi operatsiyalar</h2>
      <Table
        heads={[
          "Sana",
          "Turi",
          "To‘lov turi",
          "Kim / nima",
          "Summa",
          "Kommentariya",
          "",
        ]}
      >
        {transactions.map((x) => (
          <tr key={x._id}>
            <td>{formatUzDate(x.date)}</td>
            <td>{transactionType(x.type)}</td>
            <td>{methodName(x.paymentMethod)}</td>
            <td>{transactionName(x)}</td>
            <td>
              <b>{money(x.amount)}</b>
            </td>
            <td>{x.comment || "—"}</td>
            <td>
              <button className="edit" onClick={() => editTransaction(x)}>
                O‘zgartirish
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function FinanceEvents() {
  type FinanceTab = FinanceEvent["type"];
  const today = new Date().toISOString().slice(0, 10);
  const empty = {
    date: today,
    amount: 0,
    paymentMethod: "bank_transfer" as "cash" | "bank_transfer",
    teacherId: "",
    investorName: "",
    annualInterestRate: 0,
    comment: "",
  };
  const [tab, setTab] = useState<FinanceTab>("investor_capital");
  const [form, setForm] = useState(empty);
  const [items, setItems] = useState<FinanceEvent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState("");
  const money = (value: number) => `${value.toLocaleString("uz-UZ")} so‘m`;
  const load = () =>
    Promise.all([
      api<FinanceEvent[]>("/finance-events"),
      api<Teacher[]>("/teachers"),
    ]).then(([events, teacherList]) => {
      setItems(events);
      setTeachers(teacherList);
    });
  useEffect(() => {
    load();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/finance-events", {
        method: "POST",
        body: JSON.stringify({ ...form, type: tab }),
      });
      setForm(empty);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Moliyaviy hodisani o‘chirasizmi?")) return;
    await api(`/finance-events/${id}`, { method: "DELETE" });
    load();
  }
  const typeName = (type: FinanceTab) =>
    ({
      investor_capital: "Investor kapitali",
      loan_received: "Kredit olish",
      salary_accrual: "Ish haqi hisoblash",
      cash_transfer: "Inkassatsiya",
    })[type];
  return (
    <>
      <Title
        title="Moliyaviy hodisalar"
        subtitle="Pul harakati va hisoblangan majburiyatlarni alohida kiriting"
      />
      <div className="cash-tabs">
        <button
          className={tab === "cash_transfer" ? "active" : ""}
          onClick={() => setTab("cash_transfer")}
        >
          Inkassatsiya
        </button>
        <button
          className={tab === "investor_capital" ? "active" : ""}
          onClick={() => setTab("investor_capital")}
        >
          Investor kapitali
        </button>
        <button
          className={tab === "loan_received" ? "active" : ""}
          onClick={() => setTab("loan_received")}
        >
          Kredit olish
        </button>
        <button
          className={tab === "salary_accrual" ? "active" : ""}
          onClick={() => setTab("salary_accrual")}
        >
          Ish haqi hisoblash
        </button>
      </div>
      <Notice value={error} />
      <form className="cash-form" onSubmit={submit}>
        <label>
          Sana
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        {tab === "investor_capital" && (
          <label>
            Investor nomi
            <input
              required
              value={form.investorName}
              onChange={(e) =>
                setForm({ ...form, investorName: e.target.value })
              }
            />
          </label>
        )}
        {tab === "salary_accrual" && (
          <label>
            O‘qituvchi
            <select
              required
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            >
              <option value="">O‘qituvchini tanlang</option>
              {teachers.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.firstName} {x.lastName}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === "loan_received" && (
          <label>
            Yillik foiz (%)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.annualInterestRate}
              onChange={(e) =>
                setForm({ ...form, annualInterestRate: Number(e.target.value) })
              }
            />
          </label>
        )}
        <label>
          Summa
          <input
            type="number"
            min="1"
            required
            value={form.amount || ""}
            onChange={(e) =>
              setForm({ ...form, amount: Number(e.target.value) })
            }
          />
        </label>
        {tab !== "salary_accrual" && tab !== "cash_transfer" && (
          <label>
            Pul tushgan joy
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({
                  ...form,
                  paymentMethod: e.target.value as "cash" | "bank_transfer",
                })
              }
            >
              <option value="bank_transfer">Bank hisobi</option>
              <option value="cash">Naqd kassa</option>
            </select>
          </label>
        )}
        <label>
          Kommentariya
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
          />
        </label>
        <button>Saqlash</button>
      </form>
      <h2 className="section-title">Hodisalar tarixi</h2>
      <Table heads={["Sana", "Hodisa", "Kim", "Summa", "Izoh", ""]}>
        {items.map((x) => (
          <tr key={x._id}>
            <td>{formatUzDate(x.date)}</td>
            <td>{typeName(x.type)}</td>
            <td>
              {x.teacher
                ? `${x.teacher.firstName} ${x.teacher.lastName}`
                : x.investorName || "—"}
            </td>
            <td>
              <b>{money(x.amount)}</b>
            </td>
            <td>{x.comment || "—"}</td>
            <td>
              <button className="danger" onClick={() => remove(x._id)}>
                O‘chirish
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function expenseLabel(account: string) {
  const labels: Record<string, string> = {
    interest_expense: "Kredit foizi",
    "expense:rent": "Ijara",
    "expense:electricity": "Elektr",
    "expense:utilities": "Kommunal",
    "expense:marketing": "Marketing",
    salary_expense: "Ish haqi",
  };
  return labels[account] ?? account.replace("expense:", "");
}
function Reports() {
  type ReportTab = "all" | "profit" | "cashflow" | "balance" | "details";
  type ReportData = {
    profitLoss: {
      revenue: number;
      teacherExpense: number;
      otherExpenses: number;
      breakdown: { account: string; amount: number }[];
      totalExpenses: number;
      netProfit: number;
    };
    cashFlow: {
      openingCash: number;
      operating: number;
      investing: number;
      financing: number;
      netChange: number;
      closingCash: number;
    };
    balance: {
      assets: {
        cash: number;
        receivables: number;
        teacherAdvances: number;
        equipment: number;
      };
      liabilities: {
        studentAdvances: number;
        salaryPayable: number;
        loanPayable: number;
      };
      equity: { investorCapital: number; retainedEarnings: number };
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
      difference: number;
    };
    transactions: CashTransaction[];
    lessons: Lesson[];
    financeEvents: FinanceEvent[];
    activity: {
      _id: string;
      date: string;
      type: string;
      description: string;
      paymentMethod?: PaymentMethod;
      lines: { debit: number }[];
    }[];
  };
  const now = new Date();
  const dateValue = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const [tab, setTab] = useState<ReportTab>("all");
  const [filters, setFilters] = useState({
    from: dateValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: dateValue(now),
    type: "",
    paymentMethod: "",
    groupId: "",
    teacherId: "",
    studentId: "",
    categoryId: "",
  });
  const [data, setData] = useState<ReportData | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Expense[]>([]);
  const [error, setError] = useState("");
  const money = (value: number) =>
    `${(value ?? 0).toLocaleString("uz-UZ")} so‘m`;
  function load(current = filters) {
    const query = new URLSearchParams(
      Object.entries(current).filter(([, value]) => value),
    );
    api<ReportData>(`/reports?${query}`)
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }
  useEffect(() => {
    Promise.all([
      api<Group[]>("/groups"),
      api<Teacher[]>("/teachers"),
      api<Student[]>("/students"),
      api<Expense[]>("/expense-categories"),
    ]).then(([g, t, s, c]) => {
      setGroups(g);
      setTeachers(t);
      setStudents(s);
      setCategories(c);
    });
    load();
  }, []);
  function change(name: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    load();
  }
  const methodName = (method?: PaymentMethod) =>
    ({
      cash: "Naqd",
      card: "Plastik karta",
      payme: "Payme",
      click: "Click",
      bank_transfer: "Bank o‘tkazmasi",
    })[method ?? "cash"];
  const typeName = (type: CashTransaction["type"]) =>
    ({
      teacher_salary: "O‘qituvchiga maosh",
      student_payment: "O‘quvchidan to‘lov",
      expense: "Xarajat",
    })[type];
  const personName = (item: CashTransaction) =>
    item.student
      ? `${item.student.firstName} ${item.student.lastName}`
      : item.teacher
        ? `${item.teacher.firstName} ${item.teacher.lastName}`
        : (item.expenseCategory?.name ?? "—");
  const balanceRight =
    (data?.balance.totalLiabilities ?? 0) + (data?.balance.totalEquity ?? 0);
  return (
    <>
      <Title
        title="Hisobotlar"
        subtitle="Foyda va zarar, Pul oqimi va Balans"
      />
      <form className="report-filters" onSubmit={submit}>
        <label>
          Oy
          <input
            type="month"
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m] = e.target.value.split("-").map(Number);
              setFilters((current) => ({
                ...current,
                from: `${e.target.value}-01`,
                to: `${e.target.value}-${new Date(y, m, 0).getDate()}`,
              }));
            }}
          />
        </label>
        <label>
          Dan
          <input
            type="date"
            value={filters.from}
            onChange={(e) => change("from", e.target.value)}
          />
        </label>
        <label>
          Gacha
          <input
            type="date"
            value={filters.to}
            onChange={(e) => change("to", e.target.value)}
          />
        </label>
        <label>
          Operatsiya
          <select
            value={filters.type}
            onChange={(e) => change("type", e.target.value)}
          >
            <option value="">Barchasi</option>
            <option value="student_payment">O‘quvchi to‘lovi</option>
            <option value="teacher_salary">O‘qituvchi maoshi</option>
            <option value="expense">Xarajat</option>
          </select>
        </label>
        <label>
          To‘lov turi
          <select
            value={filters.paymentMethod}
            onChange={(e) => change("paymentMethod", e.target.value)}
          >
            <option value="">Barchasi</option>
            <option value="cash">Naqd</option>
            <option value="card">Plastik karta</option>
            <option value="payme">Payme</option>
            <option value="click">Click</option>
            <option value="bank_transfer">Bank o‘tkazmasi</option>
          </select>
        </label>
        <label>
          Guruh
          <select
            value={filters.groupId}
            onChange={(e) => change("groupId", e.target.value)}
          >
            <option value="">Barchasi</option>
            {groups.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          O‘qituvchi
          <select
            value={filters.teacherId}
            onChange={(e) => change("teacherId", e.target.value)}
          >
            <option value="">Barchasi</option>
            {teachers.map((x) => (
              <option key={x._id} value={x._id}>
                {x.firstName} {x.lastName}
              </option>
            ))}
          </select>
        </label>
        <label>
          O‘quvchi
          <select
            value={filters.studentId}
            onChange={(e) => change("studentId", e.target.value)}
          >
            <option value="">Barchasi</option>
            {students.map((x) => (
              <option key={x._id} value={x._id}>
                {x.firstName} {x.lastName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Xarajat asosi
          <select
            value={filters.categoryId}
            onChange={(e) => change("categoryId", e.target.value)}
          >
            <option value="">Barchasi</option>
            {categories.map((x) => (
              <option key={x._id} value={x._id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <button>Ko‘rsatish</button>
      </form>
      <Notice value={error} />
      <p className="dash-hint">
        Moliyaviy hisobotlar butun markaz bo‘yicha tanlangan sanalar uchun.
        Shaxs, guruh, to‘lov turi va xarajat filtrlari Operatsiyalar jadvaliga
        tegishli (oxirgi 200 ta).
      </p>
      <div className="report-tabs">
        <button
          className={tab === "all" ? "active" : ""}
          onClick={() => setTab("all")}
        >
          Uchala hisobot
        </button>
        <button
          className={tab === "profit" ? "active" : ""}
          onClick={() => setTab("profit")}
        >
          Foyda va zarar
        </button>
        <button
          className={tab === "cashflow" ? "active" : ""}
          onClick={() => setTab("cashflow")}
        >
          Pul oqimi
        </button>
        <button
          className={tab === "balance" ? "active" : ""}
          onClick={() => setTab("balance")}
        >
          Balans
        </button>
        <button
          className={tab === "details" ? "active" : ""}
          onClick={() => setTab("details")}
        >
          Operatsiyalar
        </button>
      </div>
      {data && (tab === "profit" || tab === "all") && (
        <ReportTable
          title="Foyda va zarar"
          rows={[
            ["Darslardan daromad", data.profitLoss.revenue],
            [
              "O‘qituvchilar hisoblangan maoshi",
              -data.profitLoss.teacherExpense,
            ],
            ...data.profitLoss.breakdown
              .filter((row) => row.account !== "salary_expense")
              .map(
                (row) =>
                  [expenseLabel(row.account), -row.amount] as [string, number],
              ),
            ["Jami xarajat", -data.profitLoss.totalExpenses],
            ["Sof foyda", data.profitLoss.netProfit],
          ]}
          money={money}
        />
      )}
      {data && (tab === "cashflow" || tab === "all") && (
        <ReportTable
          title="Pul oqimi"
          rows={[
            ["Oy boshidagi pul", data.cashFlow.openingCash],
            ["Operatsion pul oqimi", data.cashFlow.operating],
            ["Investitsion pul oqimi", data.cashFlow.investing],
            ["Moliyaviy pul oqimi", data.cashFlow.financing],
            ["Sof o‘zgarish", data.cashFlow.netChange],
            ["Oy oxiridagi pul", data.cashFlow.closingCash],
          ]}
          money={money}
        />
      )}
      {data && (tab === "balance" || tab === "all") && (
        <div className="balance-report">
          <ReportTable
            title="Aktivlar"
            rows={[
              ["Pul mablag‘lari", data.balance.assets.cash],
              [
                "O‘quvchilardan olinadigan qarz",
                data.balance.assets.receivables,
              ],
              [
                "O‘qituvchilarga berilgan avans",
                data.balance.assets.teacherAdvances,
              ],
              ["Asosiy vositalar", data.balance.assets.equipment],
              ["Jami aktivlar", data.balance.totalAssets],
            ]}
            money={money}
          />
          <ReportTable
            title="Majburiyatlar va kapital"
            rows={[
              [
                "O‘quvchilar oldindan to‘lovi",
                data.balance.liabilities.studentAdvances,
              ],
              [
                "O‘qituvchilarga qarzdorlik",
                data.balance.liabilities.salaryPayable,
              ],
              ["Kredit qarzi", data.balance.liabilities.loanPayable],
              ["Investor kapitali", data.balance.equity.investorCapital],
              ["Taqsimlanmagan foyda", data.balance.equity.retainedEarnings],
              ["Jami majburiyat va kapital", balanceRight],
              ["Balans farqi", data.balance.difference],
            ]}
            money={money}
          />
        </div>
      )}
      {data && tab === "details" && (
        <Table
          heads={[
            "Sana",
            "Operatsiya",
            "To‘lov turi",
            "Kim / nima",
            "Summa",
            "Izoh",
          ]}
        >
          {data.activity.map((x) => (
            <tr key={x._id}>
              <td>{formatUzDate(x.date)}</td>
              <td>
                {{
                  student_payment: "O‘quvchi to‘lovi",
                  teacher_salary: "Maosh to‘lovi",
                  expense: "Xarajat",
                  lesson_completed: "Dars",
                  investor_capital: "Investor kapitali",
                  loan_received: "Kredit olish",
                  salary_accrual: "Hisoblangan ish haqi",
                  cash_transfer: "Inkassatsiya",
                }[x.type] ?? x.type}
              </td>
              <td>{x.paymentMethod ? methodName(x.paymentMethod) : "—"}</td>
              <td>—</td>
              <td>
                {money(x.lines.reduce((sum, line) => sum + line.debit, 0))}
              </td>
              <td>{x.description}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function ReportTable({
  title,
  rows,
  money,
}: {
  title: string;
  rows: [string, number][];
  money: (value: number) => string;
}) {
  return (
    <section className="report-card">
      <h2>{title}</h2>
      {rows.map(([label, value], index) => (
        <div
          className={index === rows.length - 1 ? "report-total" : ""}
          key={label}
        >
          <span>{label}</span>
          <b className={value < 0 ? "negative-value" : ""}>{money(value)}</b>
        </div>
      ))}
    </section>
  );
}

function Expenses() {
  const empty = { name: "", description: "" };
  const [items, setItems] = useState<Expense[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const load = () => api<Expense[]>("/expense-categories").then(setItems);
  useEffect(() => {
    load();
  }, []);
  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(empty);
  }
  function create() {
    setEditingId(null);
    setForm(empty);
    setModalOpen(true);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(
        editingId ? `/expense-categories/${editingId}` : "/expense-categories",
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) },
      );
      closeModal();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function edit(item: Expense) {
    setEditingId(item._id);
    setForm({ name: item.name, description: item.description });
    setModalOpen(true);
  }
  async function remove(item: Expense) {
    if (!window.confirm(`“${item.name}” xarajat asosini o‘chirasizmi?`)) return;
    setError("");
    try {
      await api(`/expense-categories/${item._id}`, { method: "DELETE" });
      if (editingId === item._id) {
        setEditingId(null);
        setForm(empty);
      }
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <>
      <Title
        title="Xarajat asoslari"
        subtitle="Xarajat nomlari va izohlari"
        action={<button onClick={create}>+ Xarajat qo‘shish</button>}
      />
      <Notice value={error} />
      {modalOpen && (
        <Modal
          title={editingId ? "Xarajatni o‘zgartirish" : "Yangi xarajat asosi"}
          onClose={closeModal}
        >
          <form className="modal-form" onSubmit={submit}>
            <label>
              Nomi
              <input
                placeholder="Xarajat nomi"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Izoh
              <textarea
                placeholder="Izoh"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="cancel" onClick={closeModal}>
                Bekor qilish
              </button>
              <button>{editingId ? "Saqlash" : "Qo‘shish"}</button>
            </div>
          </form>
        </Modal>
      )}
      <Table heads={["Nomi", "Izoh", ""]}>
        {items.map((x) => (
          <tr key={x._id}>
            <td>
              <b>{x.name}</b>
            </td>
            <td>{x.description || "—"}</td>
            <td>
              <div className="row-actions">
                <button className="edit" onClick={() => edit(x)}>
                  O‘zgartirish
                </button>
                <button className="danger" onClick={() => remove(x)}>
                  O‘chirish
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
function Table({ heads, children }: { heads: string[]; children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {heads.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
