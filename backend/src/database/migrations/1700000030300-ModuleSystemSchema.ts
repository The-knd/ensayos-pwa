import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline ModuleSystemSchema: esquema final del dominio ModuleSystem.
 * Generado a partir del esquema de referencia (db_a_schema.sql) y luego
 * acondicionado con IF NOT EXISTS / DO ... EXCEPTION para que sea seguro
 * en entornos donde ya existan objetos.
 */
export class ModuleSystemSchema1700000030300 implements MigrationInterface {
  name = "ModuleSystemSchema1700000030300";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      --
      -- Name: module_assignments; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "module_assignments" (
          module_id uuid NOT NULL,
          company_id uuid NOT NULL,
          placement character varying DEFAULT 'grid'::character varying NOT NULL,
          "position" integer DEFAULT 0 NOT NULL,
          enabled boolean DEFAULT true NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT chk_assignment_placement CHECK (((placement)::text = ANY ((ARRAY['grid'::character varying, 'fab'::character varying])::text[])))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "module_assignments" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: module_variants; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "module_variants" (
          id uuid DEFAULT gen_random_uuid() NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL,
          deleted_at timestamp with time zone,
          module_id uuid NOT NULL,
          company_id uuid NOT NULL,
          label character varying(120),
          icon character varying(500),
          path character varying(200),
          config jsonb DEFAULT '{}'::jsonb NOT NULL,
          enabled_operations jsonb DEFAULT '[]'::jsonb NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "module_variants" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: modules; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "modules" (
          id uuid DEFAULT gen_random_uuid() NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL,
          deleted_at timestamp with time zone,
          company_id uuid,
          key character varying NOT NULL,
          module character varying NOT NULL,
          label character varying NOT NULL,
          icon character varying(500),
          path character varying NOT NULL,
          operations jsonb DEFAULT '[]'::jsonb NOT NULL,
          flag character varying,
          enabled boolean DEFAULT true NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "modules" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: idx_module_variants_company; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "idx_module_variants_company" ON "module_variants" USING btree (company_id)
    `);

    await queryRunner.query(`
      --
      -- Name: uq_modules_global_key; Type: INDEX; Schema: public; Owner: -
      --
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_modules_global_key" ON "modules" USING btree (key) WHERE (company_id IS NULL)
    `);

    await queryRunner.query(`
      --
      -- Name: module_assignments; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "module_assignments" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: module_variants; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "module_variants" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: modules; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: module_assignments tenant_isolation_module_assignments; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_module_assignments" ON "module_assignments";
      CREATE POLICY "tenant_isolation_module_assignments" ON "module_assignments" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: module_variants tenant_isolation_module_variants; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_module_variants" ON "module_variants";
      CREATE POLICY "tenant_isolation_module_variants" ON "module_variants" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: modules tenant_isolation_modules; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_modules" ON "modules";
      CREATE POLICY "tenant_isolation_modules" ON "modules" USING (((company_id IS NULL) OR (company_id = (current_setting('app.current_company_id'::text, true))::uuid))) WITH CHECK (((company_id IS NULL) OR (company_id = (current_setting('app.current_company_id'::text, true))::uuid)))
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'module_assignments_pkey') THEN
          --
          -- Name: module_assignments module_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "module_assignments" ADD CONSTRAINT module_assignments_pkey PRIMARY KEY (module_id, company_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'module_assignments_company_id_fkey') THEN
          --
          -- Name: module_assignments module_assignments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "module_assignments" ADD CONSTRAINT module_assignments_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'module_assignments_module_id_fkey') THEN
          --
          -- Name: module_assignments module_assignments_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "module_assignments" ADD CONSTRAINT module_assignments_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'module_variants_module_id_company_id_key') THEN
          --
          -- Name: module_variants module_variants_module_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "module_variants" ADD CONSTRAINT module_variants_module_id_company_id_key UNIQUE (module_id, company_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'module_variants_pkey') THEN
          --
          -- Name: module_variants module_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "module_variants" ADD CONSTRAINT module_variants_pkey PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'module_variants_company_id_fkey') THEN
          --
          -- Name: module_variants module_variants_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "module_variants" ADD CONSTRAINT module_variants_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'module_variants_module_id_fkey') THEN
          --
          -- Name: module_variants module_variants_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "module_variants" ADD CONSTRAINT module_variants_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modules_pkey') THEN
          --
          -- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "modules" ADD CONSTRAINT modules_pkey PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modules_company_id_fkey') THEN
          --
          -- Name: modules modules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "modules" ADD CONSTRAINT modules_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op intencional: revertir un baseline con datos de producción es destructivo.
  }
}
