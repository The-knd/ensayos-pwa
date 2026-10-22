import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline IntegrationsSchema: esquema final del dominio Integrations.
 * Generado a partir del esquema de referencia (db_a_schema.sql) y luego
 * acondicionado con IF NOT EXISTS / DO ... EXCEPTION para que sea seguro
 * en entornos donde ya existan objetos.
 */
export class IntegrationsSchema1700000030400 implements MigrationInterface {
  name = "IntegrationsSchema1700000030400";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_connections_auth_type_enum') THEN
          --
          -- Name: integration_connections_auth_type_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "integration_connections_auth_type_enum" AS ENUM (
              'token',
              'basic',
              'session'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      --
      -- Name: connection_systems; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "connection_systems" (
          key character varying(40) NOT NULL,
          label character varying(120) NOT NULL,
          enabled boolean DEFAULT true NOT NULL,
          sort_order integer DEFAULT 0 NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      --
      -- Name: connection_templates; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "connection_templates" (
          id uuid DEFAULT gen_random_uuid() NOT NULL,
          system_key character varying(40) NOT NULL,
          label character varying(120) NOT NULL,
          settings_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
          secret_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
          auth_type character varying(20),
          enabled boolean DEFAULT true NOT NULL,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      --
      -- Name: integration_connections; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "integration_connections" (
          id uuid DEFAULT gen_random_uuid() NOT NULL,
          company_id uuid NOT NULL,
          system character varying(40) NOT NULL,
          environment character varying(20) DEFAULT 'production'::character varying NOT NULL,
          enabled boolean DEFAULT false NOT NULL,
          auth_type integration_connections_auth_type_enum NOT NULL,
          base_url text NOT NULL,
          settings jsonb DEFAULT '{}'::jsonb NOT NULL,
          credentials_encrypted text,
          key_version smallint DEFAULT 1 NOT NULL,
          credentials_updated_at timestamp with time zone,
          expires_at timestamp with time zone,
          last_test_at timestamp with time zone,
          last_test_status character varying(20),
          updated_by uuid,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL,
          module character varying(60) NOT NULL,
          label character varying(120) NOT NULL,
          template_id uuid,
          CONSTRAINT "CK_integration_connections_enabled_has_creds" CHECK (((NOT enabled) OR (credentials_encrypted IS NOT NULL))),
          CONSTRAINT integration_connections_environment_check CHECK (((environment)::text = ANY ((ARRAY['production'::character varying, 'test'::character varying])::text[])))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "integration_connections" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: integration_jobs; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "integration_jobs" (
          id uuid DEFAULT gen_random_uuid() NOT NULL,
          company_id uuid NOT NULL,
          system character varying(40) NOT NULL,
          environment character varying(20) NOT NULL,
          operation character varying(60) NOT NULL,
          trigger character varying(20) NOT NULL,
          launched_by uuid,
          status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
          attempts integer DEFAULT 0 NOT NULL,
          next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
          started_at timestamp with time zone,
          finished_at timestamp with time zone,
          cursor jsonb,
          result jsonb,
          error jsonb,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT integration_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'done'::character varying, 'failed'::character varying])::text[]))),
          CONSTRAINT integration_jobs_trigger_check CHECK (((trigger)::text = ANY ((ARRAY['manual'::character varying, 'schedule'::character varying])::text[])))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "integration_jobs" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: UQ_integration_jobs_active; Type: INDEX; Schema: public; Owner: -
      --
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_integration_jobs_active" ON "integration_jobs" USING btree (company_id, system, operation) WHERE ((status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying])::text[]))
    `);

    await queryRunner.query(`
      --
      -- Name: idx_integration_connections_company_module; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "idx_integration_connections_company_module" ON "integration_connections" USING btree (company_id, module)
    `);

    await queryRunner.query(`
      --
      -- Name: idx_integration_jobs_company_created; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "idx_integration_jobs_company_created" ON "integration_jobs" USING btree (company_id, created_at DESC)
    `);

    await queryRunner.query(`
      --
      -- Name: integration_connections; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "integration_connections" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: integration_jobs; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "integration_jobs" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: integration_connections tenant_isolation_integration_connections; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_integration_connections" ON "integration_connections";
      CREATE POLICY "tenant_isolation_integration_connections" ON "integration_connections" USING ((company_id = (NULLIF(current_setting('app.current_company_id'::text, true), ''::text))::uuid)) WITH CHECK ((company_id = (NULLIF(current_setting('app.current_company_id'::text, true), ''::text))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: integration_jobs tenant_isolation_integration_jobs; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_integration_jobs" ON "integration_jobs";
      CREATE POLICY "tenant_isolation_integration_jobs" ON "integration_jobs" USING ((company_id = (NULLIF(current_setting('app.current_company_id'::text, true), ''::text))::uuid)) WITH CHECK ((company_id = (NULLIF(current_setting('app.current_company_id'::text, true), ''::text))::uuid))
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_connection_templates_system_label') THEN
          --
          -- Name: connection_templates UQ_connection_templates_system_label; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "connection_templates" ADD CONSTRAINT "UQ_connection_templates_system_label" UNIQUE (system_key, label);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connection_templates_pkey') THEN
          --
          -- Name: connection_templates connection_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "connection_templates" ADD CONSTRAINT connection_templates_pkey PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connection_templates_system_key_fkey') THEN
          --
          -- Name: connection_templates connection_templates_system_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "connection_templates" ADD CONSTRAINT connection_templates_system_key_fkey FOREIGN KEY (system_key) REFERENCES connection_systems(key) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_integration_connections_company_label') THEN
          --
          -- Name: integration_connections UQ_integration_connections_company_label; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_connections" ADD CONSTRAINT "UQ_integration_connections_company_label" UNIQUE (company_id, label);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_connections_pkey') THEN
          --
          -- Name: integration_connections integration_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_connections" ADD CONSTRAINT integration_connections_pkey PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_connections_company_id_fkey') THEN
          --
          -- Name: integration_connections integration_connections_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_connections" ADD CONSTRAINT integration_connections_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_connections_template_id_fkey') THEN
          --
          -- Name: integration_connections integration_connections_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_connections" ADD CONSTRAINT integration_connections_template_id_fkey FOREIGN KEY (template_id) REFERENCES connection_templates(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_connections_updated_by_fkey') THEN
          --
          -- Name: integration_connections integration_connections_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_connections" ADD CONSTRAINT integration_connections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connection_systems_pkey') THEN
          --
          -- Name: connection_systems connection_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "connection_systems" ADD CONSTRAINT connection_systems_pkey PRIMARY KEY (key);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_jobs_pkey') THEN
          --
          -- Name: integration_jobs integration_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_jobs" ADD CONSTRAINT integration_jobs_pkey PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_jobs_company_id_fkey') THEN
          --
          -- Name: integration_jobs integration_jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_jobs" ADD CONSTRAINT integration_jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integration_jobs_launched_by_fkey') THEN
          --
          -- Name: integration_jobs integration_jobs_launched_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "integration_jobs" ADD CONSTRAINT integration_jobs_launched_by_fkey FOREIGN KEY (launched_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op intencional: revertir un baseline con datos de producción es destructivo.
  }
}
