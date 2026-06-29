type Base44Client = ReturnType<typeof import("npm:@base44/sdk@0.8.31").createClientFromRequest>;

/** Entity access with service-role permissions (backend functions only). */
export function serviceEntities(base44: Base44Client) {
  const entities = base44.asServiceRole?.entities ?? base44.entities;
  return entities;
}
