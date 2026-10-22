import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline CoreSchema: esquema final del dominio Core.
 * Generado a partir del esquema de referencia (db_a_schema.sql) y luego
 * acondicionado con IF NOT EXISTS / DO ... EXCEPTION para que sea seguro
 * en entornos donde ya existan objetos.
 */
export class CoreSchema1700000030000 implements MigrationInterface {
  name = "CoreSchema1700000030000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      --
      -- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
      --
      CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public
    `);

    await queryRunner.query(`
      --
      -- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
      --
      COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions'
    `);

    await queryRunner.query(`
      --
      -- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
      --
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public
    `);

    await queryRunner.query(`
      --
      -- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
      --
      COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'companies_auth_strategy_enum') THEN
          --
          -- Name: companies_auth_strategy_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "companies_auth_strategy_enum" AS ENUM (
              'local',
              'passkey',
              'microsoft'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_status_enum') THEN
          --
          -- Name: users_status_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "users_status_enum" AS ENUM (
              'active',
              'inactive',
              'blocked'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      --
      -- Name: companies; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "companies" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          name character varying(150) NOT NULL,
          logo_url character varying,
          primary_color character varying(7) DEFAULT '#0057B8'::character varying NOT NULL,
          auth_strategy companies_auth_strategy_enum DEFAULT 'local'::companies_auth_strategy_enum NOT NULL,
          is_active boolean DEFAULT true NOT NULL
      )
    `);

    await queryRunner.query(`
      --
      -- Name: devices; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "devices" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          user_id uuid NOT NULL,
          credential_id character varying NOT NULL,
          public_key text NOT NULL,
          counter integer DEFAULT 0 NOT NULL,
          device_name character varying
      )
    `);

    await queryRunner.query(`
      --
      -- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "feature_flags" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid NOT NULL,
          user_id uuid,
          key character varying NOT NULL,
          enabled boolean DEFAULT false NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "feature_flags" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: permissions; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "permissions" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          resource character varying NOT NULL,
          action character varying NOT NULL,
          condition jsonb,
          code character varying NOT NULL
      )
    `);

    await queryRunner.query(`
      --
      -- Name: profile_permissions; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "profile_permissions" (
          profile_id uuid NOT NULL,
          permission_id uuid NOT NULL
      )
    `);

    await queryRunner.query(`
      --
      -- Name: profiles; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "profiles" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid,
          name character varying(100) NOT NULL,
          is_system_role boolean DEFAULT false NOT NULL
      )
    `);

    await queryRunner.query(`
      --
      -- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          user_id character varying NOT NULL,
          expires_at timestamp without time zone NOT NULL,
          revoked boolean DEFAULT false NOT NULL,
          token_hash character varying(64) NOT NULL
      )
    `);

    await queryRunner.query(`
      --
      -- Name: users; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "users" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid,
          profile_id uuid NOT NULL,
          email character varying NOT NULL,
          password_hash character varying,
          status users_status_enum DEFAULT 'active'::users_status_enum NOT NULL,
          permissions_version integer DEFAULT 0 NOT NULL,
          full_name character varying(200) NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: uq_refresh_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
      --
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_refresh_tokens_token_hash" ON "refresh_tokens" USING btree (token_hash)
    `);

    await queryRunner.query(`
      --
      -- Name: feature_flags; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: feature_flags tenant_isolation_feature_flags; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_feature_flags" ON "feature_flags";
      CREATE POLICY "tenant_isolation_feature_flags" ON "feature_flags" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: users tenant_isolation_users; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_users" ON "users";
      CREATE POLICY "tenant_isolation_users" ON "users" USING (((company_id = (current_setting('app.current_company_id'::text, true))::uuid) OR (company_id IS NULL))) WITH CHECK (((company_id = (current_setting('app.current_company_id'::text, true))::uuid) OR (company_id IS NULL)))
    `);

    await queryRunner.query(`
      --
      -- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "users" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_7d8bee0204106019488c4c50ffa') THEN
          --
          -- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "refresh_tokens" ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_8e520eb4da7dc01d0e190447c8e') THEN
          --
          -- Name: profiles PK_8e520eb4da7dc01d0e190447c8e; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "profiles" ADD CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_2e85e2434a500fab8bacdcef196') THEN
          --
          -- Name: profiles FK_2e85e2434a500fab8bacdcef196; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "profiles" ADD CONSTRAINT "FK_2e85e2434a500fab8bacdcef196" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_920331560282b8bd21bb02290df') THEN
          --
          -- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "permissions" ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_8dad765629e83229da6feda1c1d') THEN
          --
          -- Name: permissions UQ_8dad765629e83229da6feda1c1d; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "permissions" ADD CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE (code);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_a3ffb1c0c8416b9fc6f907b7433') THEN
          --
          -- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "users" ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_97672ac88f789774dd47f7c8be3') THEN
          --
          -- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_23371445bd80cb3e413089551bf') THEN
          --
          -- Name: users FK_23371445bd80cb3e413089551bf; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "users" ADD CONSTRAINT "FK_23371445bd80cb3e413089551bf" FOREIGN KEY (profile_id) REFERENCES profiles(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_7ae6334059289559722437bcc1c') THEN
          --
          -- Name: users FK_7ae6334059289559722437bcc1c; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "users" ADD CONSTRAINT "FK_7ae6334059289559722437bcc1c" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_b1514758245c12daf43486dd1f0') THEN
          --
          -- Name: devices PK_b1514758245c12daf43486dd1f0; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "devices" ADD CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_d60bf400507800b3885ff662e11') THEN
          --
          -- Name: devices UQ_d60bf400507800b3885ff662e11; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "devices" ADD CONSTRAINT "UQ_d60bf400507800b3885ff662e11" UNIQUE (credential_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_5e9bee993b4ce35c3606cda194c') THEN
          --
          -- Name: devices FK_5e9bee993b4ce35c3606cda194c; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "devices" ADD CONSTRAINT "FK_5e9bee993b4ce35c3606cda194c" FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_d4bc3e82a314fa9e29f652c2c22') THEN
          --
          -- Name: companies PK_d4bc3e82a314fa9e29f652c2c22; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "companies" ADD CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY (id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_db657d344e9caacfc9d5cf8bbac') THEN
          --
          -- Name: feature_flags PK_db657d344e9caacfc9d5cf8bbac; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "feature_flags" ADD CONSTRAINT "PK_db657d344e9caacfc9d5cf8bbac" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_6527c3ce3b35dd965d9ca910c84') THEN
          --
          -- Name: feature_flags FK_6527c3ce3b35dd965d9ca910c84; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "feature_flags" ADD CONSTRAINT "FK_6527c3ce3b35dd965d9ca910c84" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_e8fe608c025f78c930d51b9e0a1') THEN
          --
          -- Name: profile_permissions PK_e8fe608c025f78c930d51b9e0a1; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "profile_permissions" ADD CONSTRAINT "PK_e8fe608c025f78c930d51b9e0a1" PRIMARY KEY (profile_id, permission_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_19c508ca44879d33b24e462a14d') THEN
          --
          -- Name: profile_permissions FK_19c508ca44879d33b24e462a14d; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "profile_permissions" ADD CONSTRAINT "FK_19c508ca44879d33b24e462a14d" FOREIGN KEY (profile_id) REFERENCES profiles(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c517fd1e3706fad732bdfbaadeb') THEN
          --
          -- Name: profile_permissions FK_c517fd1e3706fad732bdfbaadeb; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "profile_permissions" ADD CONSTRAINT "FK_c517fd1e3706fad732bdfbaadeb" FOREIGN KEY (permission_id) REFERENCES permissions(id);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op intencional: revertir un baseline con datos de producción es destructivo.
  }
}
