const { ContextManager } = require('../src/services/contextManager');

function createSupabaseMock({ selectReturn } = {}) {
  const upsert = jest.fn().mockResolvedValue({ error: null });
  const single = jest.fn().mockResolvedValue(selectReturn || { data: null, error: new Error('not found') });
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ upsert, select }));
  return { from, upsert, select, eq, single };
}

describe('ContextManager', () => {
  test('saveContext stores data and updates cache', async () => {
    const supabase = createSupabaseMock();
    const manager = new ContextManager(supabase);
    const ctx = { foo: 'bar' };
    await manager.saveContext('u1', ctx);
    expect(supabase.from).toHaveBeenCalledWith('user_contexts');
    expect(supabase.upsert).toHaveBeenCalled();
    expect(manager.activeContexts.get('u1')).toEqual(ctx);
  });

  test('getContext returns cached context', async () => {
    const supabase = createSupabaseMock();
    const manager = new ContextManager(supabase);
    manager.activeContexts.set('u1', { foo: 'cached' });
    const ctx = await manager.getContext('u1');
    expect(ctx).toEqual({ foo: 'cached' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('getContext retrieves from supabase when not cached', async () => {
    const supabase = createSupabaseMock({ selectReturn: { data: { context: { foo: 'db' } }, error: null } });
    const manager = new ContextManager(supabase);
    const ctx = await manager.getContext('u1');
    expect(ctx).toEqual({ foo: 'db' });
    expect(manager.activeContexts.get('u1')).toEqual({ foo: 'db' });
    expect(supabase.select).toHaveBeenCalledWith('context');
  });

  test('getContext falls back to default when none found', async () => {
    const supabase = createSupabaseMock();
    const manager = new ContextManager(supabase);
    const ctx = await manager.getContext('u2');
    expect(ctx).toHaveProperty('preferences');
    expect(manager.activeContexts.get('u2')).toEqual(ctx);
  });

  test('updateGoals modifies stored context', async () => {
    const supabase = createSupabaseMock();
    const manager = new ContextManager(supabase);
    const defaultCtx = manager.createDefaultContext();
    manager.activeContexts.set('u1', { ...defaultCtx });
    await manager.updateGoals('u1', ['g1']);
    const updated = manager.activeContexts.get('u1');
    expect(updated.current_goals).toEqual(['g1']);
    expect(supabase.upsert).toHaveBeenCalled();
  });

  test('trackInteraction updates context correctly', async () => {
    const supabase = createSupabaseMock();
    const manager = new ContextManager(supabase);
    const ctx = manager.createDefaultContext();
    ctx.last_interaction = new Date('2020-01-01');
    manager.activeContexts.set('u1', { ...ctx });
    const before = Date.now();
    await manager.trackInteraction('u1', { mentioned_leads: ['a', 'b'], campaign_id: 'c' });
    const updated = manager.activeContexts.get('u1');
    expect(updated.important_leads).toEqual(['a', 'b']);
    expect(updated.active_campaigns).toEqual(['c']);
    expect(updated.last_interaction.getTime()).toBeGreaterThanOrEqual(before);
    expect(supabase.upsert).toHaveBeenCalled();
  });
});
