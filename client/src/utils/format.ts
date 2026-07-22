export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function todayISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function accountTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function fullName(client: { firstName: string; lastName: string }): string {
  return `${client.firstName} ${client.lastName}`.trim();
}

export function clientAddress(client: { street: string; city: string; state: string; zip: string }): string {
  const cityStateZip = [client.city, [client.state, client.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [client.street, cityStateZip].filter(Boolean).join(", ");
}
