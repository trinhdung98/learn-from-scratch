import { useState } from "react";
import DataTable, { type ColumnDef } from "./DataTable";
import DataTableDemo from "./DataTableV2";

interface Person {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  birthday: Date;
  age: number;
}

const data: Person[] = Array.from({ length: 20 }, (_, i) => i + 1).map(
  (item) => ({
    id: `id_${item}`,
    name: `Name ${item}`,
    address: `Address ${item}`,
    email: `Email ${item}`,
    phone: `Phone ${item},`,
    birthday: new Date(new Date().getDate() + item),
    age: item % 50,
  })
);

const columns: ColumnDef<Person>[] = [
  {
    id: "Name",
    header: () => <b>Name</b>,
    cell: (item) => item.name,
  },
  {
    id: "Address",
    header: () => <b>Address</b>,
    cell: (item) => item.address,
  },
  {
    id: "Email",
    header: () => <b>Email</b>,
    cell: (item) => item.email,
  },
  {
    id: "Phone",
    header: () => <b>Phone</b>,
    cell: (item) => item.phone,
  },
  {
    id: "Birthday",
    header: () => <b>Birthday</b>,
    cell: (item) => item.name.toString(),
  },
  {
    id: "Age",
    header: () => <b>Age</b>,
    cell: (item) => item.age,
  },
];

function App() {
  const [keyword, setKeyword] = useState<string>("");

  const items = data.filter((item) => item.name.includes(keyword));

  return (
    <>
      {/* <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <DataTable data={items} columns={columns} /> */}
      <DataTableDemo />
    </>
  );
}

export default App;
