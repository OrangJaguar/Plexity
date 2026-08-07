import { describe, expect, it } from 'vitest';
import {
  camelToSnakeKey,
  fromSqlRow,
  snakeToCamelKey,
  tableForEntity,
  toSqlFilter,
  toSqlRow,
} from '@/api/entities/supabaseMap';

describe('supabaseMap', () => {
  it('maps entity names to tables', () => {
    expect(tableForEntity('ToolsTask')).toBe('tools_task');
    expect(tableForEntity('UserPreferences')).toBe('user_preferences');
    expect(tableForEntity('AdminConverterJob')).toBeNull();
  });

  it('renames calendar start/end columns', () => {
    expect(camelToSnakeKey('start')).toBe('start_at');
    expect(camelToSnakeKey('end')).toBe('end_at');
    expect(snakeToCamelKey('start_at')).toBe('start');
    expect(snakeToCamelKey('end_at')).toBe('end');
  });

  it('converts className and userEmail', () => {
    expect(camelToSnakeKey('className')).toBe('class_name');
    expect(camelToSnakeKey('userEmail')).toBe('user_email');
    expect(snakeToCamelKey('class_name')).toBe('className');
  });

  it('round-trips task-like rows and strips id on insert shape', () => {
    const client = {
      id: 'client-task-id',
      taskId: 'client-task-id',
      userEmail: 'a@b.com',
      className: 'Math',
      title: 'HW',
    };
    const sql = toSqlRow(client, { stripId: true });
    expect(sql).toEqual({
      task_id: 'client-task-id',
      user_email: 'a@b.com',
      class_name: 'Math',
      title: 'HW',
    });
    expect(fromSqlRow({
      id: 'uuid-1',
      task_id: 'client-task-id',
      user_email: 'a@b.com',
      class_name: 'Math',
      title: 'HW',
    })).toEqual({
      id: 'uuid-1',
      taskId: 'client-task-id',
      userEmail: 'a@b.com',
      className: 'Math',
      title: 'HW',
    });
  });

  it('maps filters', () => {
    expect(toSqlFilter({ dateKey: '2026-08-06', userEmail: 'x@y.com' })).toEqual({
      date_key: '2026-08-06',
      user_email: 'x@y.com',
    });
  });
});
