// 입력 화면 공통: [수정] 때 수정한 사람 남기기 · [삭제] 뒤 삭제 기록 남기기 (브라우저에서 실행)
// 수정 시각은 DB가 자동으로 남김 (트리거 trg_set_updated_at). 수정한 사람은 여기서 로그인 이메일을 넣음
import { createClient } from "@/lib/supabase/client";
import { deleteSummary, safeSnapshot, type AuditTable } from "@/lib/auditCore";

type Sb = ReturnType<typeof createClient>;

export async function editorEmail(sb: Sb = createClient()): Promise<string | null> {
  const { data } = await sb.auth.getSession();
  return data.session?.user.email ?? null;
}

// 수정 값에 수정한 사람을 붙임
export async function withEditor<T extends Record<string, unknown>>(payload: T, sb: Sb = createClient()): Promise<T & { updated_by: string | null }> {
  return { ...payload, updated_by: await editorEmail(sb) };
}

// 지운 뒤 삭제 기록 남김. 삭제가 실패하면 기록하지 않음. 삭제는 됐는데 기록이 실패하면 logError로 알림
export async function deleteWithLog(
  table: AuditTable,
  row: Record<string, unknown> & { id: number; cohort_id?: number | null },
  cohortName?: string
): Promise<{ error: string | null; logError: string | null }> {
  const sb = createClient();
  const { error } = await sb.from(table).delete().eq("id", row.id);
  if (error) return { error: error.message, logError: null };
  const { error: logErr } = await sb.from("delete_log").insert({
    deleted_by: await editorEmail(sb),
    table_name: table,
    row_id: row.id,
    cohort_id: row.cohort_id ?? null,
    summary: deleteSummary(table, row, cohortName),
    snapshot: safeSnapshot(row),
  });
  return { error: null, logError: logErr ? logErr.message : null };
}
