import { useEffect, useMemo, useState } from "react";
import { ApiError, api, type ResourceFieldMetadata, type ResourceListResult, type ResourceMetadata, type ResourceQuery } from "../api";
import type { Locale } from "../i18n/messages";
import { Button, DataTable, EmptyState, Field, InlineError, Input, Select } from "../ui/primitives";
import { ResourceValue } from "./value";

type ReadError = {
  readonly message: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;
  readonly retryable: boolean;
};

const noReadError: ReadError = { message: "", status: undefined, requestId: undefined, retryable: false };

function queryFromSearch(metadata: ResourceMetadata, search: string): ResourceQuery {
  const params = new URLSearchParams(search);
  const limitRaw = Number(params.get("limit") ?? metadata.views.list.default_page_size);
  const offsetRaw = Number(params.get("offset") ?? 0);
  const sortRaw = params.get("sort");
  const directionRaw = params.get("direction");
  const sort = sortRaw && metadata.views.list.sortable_fields.includes(sortRaw) ? sortRaw : metadata.views.list.default_sort?.field;
  const direction = directionRaw === "desc" || directionRaw === "asc" ? directionRaw : metadata.views.list.default_sort?.direction;
  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!key.startsWith("filter.")) continue;
    const field = key.slice("filter.".length);
    if (metadata.views.list.filterable_fields.includes(field)) filters[field] = value;
  }
  return {
    limit: Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : metadata.views.list.default_page_size,
    offset: Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0,
    ...(sort ? { sort } : {}),
    ...(direction ? { direction } : {}),
    filters,
  };
}

function columnsFromSearch(metadata: ResourceMetadata, search: string): readonly string[] {
  const selected = new URLSearchParams(search).get("columns")?.split(",").filter((name) => metadata.views.list.columns.includes(name));
  return selected && selected.length > 0 ? selected : metadata.views.list.columns;
}

function recordKey(metadata: ResourceMetadata, row: Record<string, unknown>): string | number | undefined {
  const value = row[metadata.record_key] ?? row.id;
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function FilterControl({
  field,
  value,
  onChange,
  id,
  describedBy,
}: {
  readonly field: ResourceFieldMetadata;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly id: string;
  readonly describedBy: string | undefined;
}) {
  const common = { id, "aria-describedby": describedBy };
  if (field.type === "Boolean") return <Select {...common} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Any</option><option value="true">True</option><option value="false">False</option></Select>;
  if (field.type === "Enum") return <Select {...common} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Any</option>{field.enum?.map((option) => <option key={option} value={option}>{option}</option>)}</Select>;
  if (field.type === "Integer" || field.type === "Decimal") return <Input {...common} type="number" step={field.type === "Integer" ? 1 : "any"} value={value} onChange={(event) => onChange(event.target.value)} />;
  if (field.type === "DateTime") return <Input {...common} type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} />;
  return <Input {...common} type="text" value={value} onChange={(event) => onChange(event.target.value)} />;
}

export function ResourceGrid({ metadata, locale, onOpenRecord, refreshToken = 0 }: {
  readonly metadata: ResourceMetadata;
  readonly locale: Locale;
  readonly onOpenRecord: (record: string | number) => void;
  readonly refreshToken?: number;
}) {
  const [search, setSearch] = useState(() => location.search);
  const [data, setData] = useState<ResourceListResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReadError>(noReadError);
  const [filterField, setFilterField] = useState(metadata.views.list.filterable_fields[0] ?? "");
  const [filterValue, setFilterValue] = useState("");
  const query = useMemo(() => queryFromSearch(metadata, search), [metadata, search]);
  const columns = useMemo(() => columnsFromSearch(metadata, search), [metadata, search]);

  const setParams = (mutate: (params: URLSearchParams) => void) => {
    const url = new URL(location.href);
    mutate(url.searchParams);
    history.replaceState(null, "", `${url.pathname}${url.search}`);
    setSearch(url.search);
  };

  const refresh = async () => {
    setLoading(true);
    setError(noReadError);
    try {
      setData(await api.list(metadata.resource_id, query));
    } catch (failure) {
      setError({
        message: failure instanceof Error ? failure.message : "Load failed",
        status: failure instanceof ApiError ? failure.status : undefined,
        requestId: failure instanceof ApiError ? failure.requestId : undefined,
        retryable: failure instanceof ApiError && failure.retryable,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [metadata.resource_id, search, refreshToken]);
  useEffect(() => {
    const onPopState = () => setSearch(location.search);
    addEventListener("popstate", onPopState);
    return () => removeEventListener("popstate", onPopState);
  }, []);

  const activeFilters = Object.entries(query.filters ?? {});
  const offset = query.offset ?? 0;
  const limit = query.limit ?? metadata.views.list.default_page_size;
  const filterDefinition = filterField ? metadata.fields[filterField] : undefined;
  const hasError = error.message.length > 0;
  const permissionDenied = error.status === 403;
  const unavailable = error.status === 404;

  return <section className="resource-grid" aria-label={`${metadata.labels.plural} list`}>
    <div className="grid-toolbar">
      {metadata.views.list.filterable_fields.length > 0 && <form className="filter-bar" onSubmit={(event) => {
        event.preventDefault();
        if (!filterField || filterValue === "") return;
        let value = filterValue;
        if (filterDefinition?.type === "DateTime") {
          const parsed = new Date(filterValue);
          if (!Number.isNaN(parsed.getTime())) value = parsed.toISOString();
        }
        setParams((params) => { params.set(`filter.${filterField}`, value); params.set("offset", "0"); });
        setFilterValue("");
      }}>
        <Field label="Filter field">{({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={filterField} onChange={(event) => { setFilterField(event.target.value); setFilterValue(""); }}>{metadata.views.list.filterable_fields.map((name) => <option key={name} value={name}>{metadata.fields[name]?.label ?? name}</option>)}</Select>}</Field>
        {filterDefinition && <Field label="Filter value">{({ id, describedBy }) => <FilterControl id={id} describedBy={describedBy} field={filterDefinition} value={filterValue} onChange={setFilterValue} />}</Field>}
        <Button type="submit">Apply filter</Button>
      </form>}
      <details className="column-picker"><summary>Columns</summary>{metadata.views.list.columns.map((name) => <label key={name}><input type="checkbox" checked={columns.includes(name)} onChange={(event) => setParams((params) => {
        const next = event.target.checked ? [...columns, name] : columns.filter((column) => column !== name);
        const safe = next.length > 0 ? next : [metadata.views.list.columns[0] ?? name];
        if (safe.join(",") === metadata.views.list.columns.join(",")) params.delete("columns"); else params.set("columns", safe.join(","));
      })} />{metadata.fields[name]?.label ?? name}</label>)}</details>
    </div>

    {activeFilters.length > 0 && <div className="active-filters" aria-label="Active filters">{activeFilters.map(([name, value]) => <Button key={name} onClick={() => setParams((params) => { params.delete(`filter.${name}`); params.set("offset", "0"); })}>{metadata.fields[name]?.label ?? name}: {String(value)} ×</Button>)}</div>}
    {!loading && permissionDenied && <EmptyState title="Permission denied" description="Your account does not have permission to read this resource." />}
    {!loading && unavailable && <EmptyState title="Resource unavailable" description="This resource is not available from the current server metadata or endpoint." />}
    {!loading && hasError && !permissionDenied && !unavailable && <InlineError><p>{error.message}</p>{error.retryable && <Button onClick={() => void refresh()}>Retry</Button>}{error.requestId && <details><summary>Technical details</summary><p>Request ID: <code>{error.requestId}</code></p></details>}</InlineError>}
    {loading ? <p role="status" aria-busy="true">Loading…</p> : !hasError && data?.items.length === 0
      ? <EmptyState title={activeFilters.length > 0 ? "No matching records" : "No data yet"} description={activeFilters.length > 0 ? "Change or clear the active filters." : metadata.labels.description} />
      : !hasError && <DataTable caption={`${metadata.labels.plural} (${data?.total ?? 0} results)`}><thead><tr>{columns.map((column) => {
        const sortable = metadata.views.list.sortable_fields.includes(column);
        const active = query.sort === column;
        const ariaSort = active ? (query.direction === "desc" ? "descending" : "ascending") : "none";
        return <th key={column} aria-sort={sortable ? ariaSort : undefined}>{sortable ? <Button className="sort-button" onClick={() => setParams((params) => {
          const nextDirection = active && query.direction !== "desc" ? "desc" : "asc";
          params.set("sort", column); params.set("direction", nextDirection); params.set("offset", "0");
        })}>{metadata.fields[column]?.label ?? column}{active ? (query.direction === "desc" ? " ↓" : " ↑") : " ↕"}</Button> : (metadata.fields[column]?.label ?? column)}</th>;
      })}</tr></thead><tbody>{data?.items.map((row, index) => {
        const record = recordKey(metadata, row);
        return <tr key={String(record ?? index)}>{columns.map((column, columnIndex) => <td key={column}>{columnIndex === 0 && record !== undefined ? <a href={`/resources/${encodeURIComponent(metadata.route_key)}/${encodeURIComponent(String(record))}`} onClick={(event) => { event.preventDefault(); onOpenRecord(record); }}><ResourceValue field={metadata.fields[column]} value={row[column]} locale={locale} record={row} /></a> : <ResourceValue field={metadata.fields[column]} value={row[column]} locale={locale} record={row} />}</td>)}</tr>;
      })}</tbody></DataTable>}

    <footer className="pagination"><span>{data ? `${data.total} results` : ""}</span><div><Button disabled={offset <= 0 || loading || hasError} onClick={() => setParams((params) => params.set("offset", String(Math.max(0, offset - limit))))}>Previous</Button><Button disabled={loading || hasError || !data || offset + data.items.length >= data.total} onClick={() => setParams((params) => params.set("offset", String(offset + limit)))}>Next</Button></div></footer>
  </section>;
}
