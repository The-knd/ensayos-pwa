import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline ClientsSchema: esquema final del dominio Clients.
 * Generado a partir del esquema de referencia (db_a_schema.sql) y luego
 * acondicionado con IF NOT EXISTS / DO ... EXCEPTION para que sea seguro
 * en entornos donde ya existan objetos.
 */
export class ClientsSchema1700000030100 implements MigrationInterface {
  name = "ClientsSchema1700000030100";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_directions_type_enum') THEN
          --
          -- Name: client_directions_type_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "client_directions_type_enum" AS ENUM (
              'principal',
              'despacho'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clients_document_type_enum') THEN
          --
          -- Name: clients_document_type_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "clients_document_type_enum" AS ENUM (
              'nit',
              'cc',
              'ce',
              'pp'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clients_person_type_enum') THEN
          --
          -- Name: clients_person_type_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "clients_person_type_enum" AS ENUM (
              'natural',
              'juridica'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clients_status_enum') THEN
          --
          -- Name: clients_status_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "clients_status_enum" AS ENUM (
              'active',
              'inactive'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      --
      -- Name: client_directions; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "client_directions" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid NOT NULL,
          client_id uuid NOT NULL,
          type client_directions_type_enum NOT NULL,
          address character varying,
          department character varying,
          city character varying,
          postal_code character varying,
          phone character varying,
          contact_first_name character varying,
          contact_second_name character varying,
          contact_first_last_name character varying,
          contact_second_last_name character varying,
          description text
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "client_directions" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_external_refs; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "client_external_refs" (
          id uuid DEFAULT gen_random_uuid() NOT NULL,
          company_id uuid NOT NULL,
          system character varying(40) NOT NULL,
          external_id character varying(100) NOT NULL,
          client_id uuid NOT NULL,
          source_hash character(64),
          last_synced_at timestamp with time zone,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "client_external_refs" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_references; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "client_references" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid NOT NULL,
          client_id uuid NOT NULL,
          sequence integer NOT NULL,
          entity character varying,
          address character varying,
          department character varying,
          city character varying,
          phone character varying,
          credit_limit character varying
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "client_references" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_tax_settings; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "client_tax_settings" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid NOT NULL,
          client_id uuid NOT NULL,
          regimen_responsable_iva boolean DEFAULT false NOT NULL,
          regimen_simplificado boolean DEFAULT false NOT NULL,
          gran_contribuyente boolean DEFAULT false NOT NULL,
          autorretenedor boolean DEFAULT false NOT NULL,
          iva_19 boolean DEFAULT false NOT NULL,
          iva_5 boolean DEFAULT false NOT NULL,
          iva_exento_excluido boolean DEFAULT false NOT NULL,
          inc boolean DEFAULT false NOT NULL,
          ica_sujeto boolean DEFAULT false NOT NULL,
          gmf_sujeto boolean DEFAULT false NOT NULL,
          timbre_sujeto boolean DEFAULT false NOT NULL,
          rtefuente_honorarios boolean DEFAULT false NOT NULL,
          rtefuente_servicios boolean DEFAULT false NOT NULL,
          rtefuente_compras boolean DEFAULT false NOT NULL,
          rtefuente_arrendamiento boolean DEFAULT false NOT NULL,
          rtefuente_transporte boolean DEFAULT false NOT NULL,
          rtefuente_intereses boolean DEFAULT false NOT NULL,
          rtefuente_dividendos boolean DEFAULT false NOT NULL,
          reteiva_15 boolean DEFAULT false NOT NULL,
          reteiva_50 boolean DEFAULT false NOT NULL,
          reteiva_100 boolean DEFAULT false NOT NULL,
          reteica boolean DEFAULT false NOT NULL,
          retencion_timbre boolean DEFAULT false NOT NULL,
          retencion_gmf boolean DEFAULT false NOT NULL,
          autorretencion_fuente boolean DEFAULT false NOT NULL,
          autorretencion_ica boolean DEFAULT false NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "client_tax_settings" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: clients; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "clients" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid,
          full_name character varying(200) NOT NULL,
          document_number character varying(20) NOT NULL,
          phone character varying,
          email character varying,
          status clients_status_enum DEFAULT 'active'::clients_status_enum NOT NULL,
          document_type clients_document_type_enum,
          dv character varying(10),
          person_type clients_person_type_enum,
          commercial_name character varying,
          first_name character varying,
          second_name character varying,
          first_last_name character varying,
          second_last_name character varying,
          legal_name character varying,
          rep_first_name character varying,
          rep_second_name character varying,
          rep_first_last_name character varying,
          rep_second_last_name character varying,
          economic_activity_code character varying,
          economic_activity_description character varying,
          billing_email character varying,
          treasury_email character varying,
          establishment_vocation character varying,
          establishment_size character varying,
          service_type character varying,
          public_office boolean,
          public_office_cargo character varying,
          public_office_start date,
          public_office_end date,
          foreign_accounts boolean,
          public_resource_management boolean,
          foreign_trade boolean,
          foreign_trade_ops_per_year character varying,
          payment_method character varying,
          payment_method_other character varying,
          merchandise_description text,
          capital_registered character varying,
          funds_origin character varying,
          jur_public_office boolean,
          jur_public_resource_management boolean,
          jur_foreign_trade boolean
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "clients" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_directions; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "client_directions" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_external_refs; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "client_external_refs" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_references; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "client_references" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_tax_settings; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "client_tax_settings" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: client_directions tenant_isolation_client_directions; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_client_directions" ON "client_directions";
      CREATE POLICY "tenant_isolation_client_directions" ON "client_directions" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: client_external_refs tenant_isolation_client_external_refs; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_client_external_refs" ON "client_external_refs";
      CREATE POLICY "tenant_isolation_client_external_refs" ON "client_external_refs" USING ((company_id = (NULLIF(current_setting('app.current_company_id'::text, true), ''::text))::uuid)) WITH CHECK ((company_id = (NULLIF(current_setting('app.current_company_id'::text, true), ''::text))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: client_references tenant_isolation_client_references; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_client_references" ON "client_references";
      CREATE POLICY "tenant_isolation_client_references" ON "client_references" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: client_tax_settings tenant_isolation_client_tax_settings; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_client_tax_settings" ON "client_tax_settings";
      CREATE POLICY "tenant_isolation_client_tax_settings" ON "client_tax_settings" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: clients tenant_isolation_clients; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_clients" ON "clients";
      CREATE POLICY "tenant_isolation_clients" ON "clients" USING (((company_id IS NULL) OR (company_id = (current_setting('app.current_company_id'::text, true))::uuid))) WITH CHECK (((company_id IS NULL) OR (company_id = (current_setting('app.current_company_id'::text, true))::uuid)))
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_client_directions') THEN
          --
          -- Name: client_directions PK_client_directions; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_directions" ADD CONSTRAINT "PK_client_directions" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_directions_client') THEN
          --
          -- Name: client_directions FK_client_directions_client; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_directions" ADD CONSTRAINT "FK_client_directions_client" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_directions_company') THEN
          --
          -- Name: client_directions FK_client_directions_company; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_directions" ADD CONSTRAINT "FK_client_directions_company" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_client_references') THEN
          --
          -- Name: client_references PK_client_references; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_references" ADD CONSTRAINT "PK_client_references" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_references_client') THEN
          --
          -- Name: client_references FK_client_references_client; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_references" ADD CONSTRAINT "FK_client_references_client" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_references_company') THEN
          --
          -- Name: client_references FK_client_references_company; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_references" ADD CONSTRAINT "FK_client_references_company" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_client_tax_settings') THEN
          --
          -- Name: client_tax_settings PK_client_tax_settings; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_tax_settings" ADD CONSTRAINT "PK_client_tax_settings" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_client_tax_settings_client') THEN
          --
          -- Name: client_tax_settings UQ_client_tax_settings_client; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_tax_settings" ADD CONSTRAINT "UQ_client_tax_settings_client" UNIQUE (client_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_tax_settings_client') THEN
          --
          -- Name: client_tax_settings FK_client_tax_settings_client; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_tax_settings" ADD CONSTRAINT "FK_client_tax_settings_client" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_client_tax_settings_company') THEN
          --
          -- Name: client_tax_settings FK_client_tax_settings_company; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_tax_settings" ADD CONSTRAINT "FK_client_tax_settings_company" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_f1ab7cf3a5714dbc6bb4e1c28a4') THEN
          --
          -- Name: clients PK_f1ab7cf3a5714dbc6bb4e1c28a4; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "clients" ADD CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_e9a9c65032a13279f68ba077fc3') THEN
          --
          -- Name: clients UQ_e9a9c65032a13279f68ba077fc3; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "clients" ADD CONSTRAINT "UQ_e9a9c65032a13279f68ba077fc3" UNIQUE (document_number);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_fcadfe25d85cf21251273169128') THEN
          --
          -- Name: clients FK_fcadfe25d85cf21251273169128; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "clients" ADD CONSTRAINT "FK_fcadfe25d85cf21251273169128" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_client_external_refs_client') THEN
          --
          -- Name: client_external_refs UQ_client_external_refs_client; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_external_refs" ADD CONSTRAINT "UQ_client_external_refs_client" UNIQUE (company_id, system, client_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_client_external_refs_external') THEN
          --
          -- Name: client_external_refs UQ_client_external_refs_external; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_external_refs" ADD CONSTRAINT "UQ_client_external_refs_external" UNIQUE (company_id, system, external_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_external_refs_pkey') THEN
          --
          -- Name: client_external_refs client_external_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_external_refs" ADD CONSTRAINT client_external_refs_pkey PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_external_refs_client_id_fkey') THEN
          --
          -- Name: client_external_refs client_external_refs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_external_refs" ADD CONSTRAINT client_external_refs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_external_refs_company_id_fkey') THEN
          --
          -- Name: client_external_refs client_external_refs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "client_external_refs" ADD CONSTRAINT client_external_refs_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op intencional: revertir un baseline con datos de producción es destructivo.
  }
}
