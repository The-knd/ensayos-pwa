import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Baseline CreditsSchema: esquema final del dominio Credits.
 * Generado a partir del esquema de referencia (db_a_schema.sql) y luego
 * acondicionado con IF NOT EXISTS / DO ... EXCEPTION para que sea seguro
 * en entornos donde ya existan objetos.
 */
export class CreditsSchema1700000030200 implements MigrationInterface {
  name = "CreditsSchema1700000030200";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credits_person_type_enum') THEN
          --
          -- Name: credits_person_type_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "credits_person_type_enum" AS ENUM (
              'natural',
              'juridica'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credits_status_enum') THEN
          --
          -- Name: credits_status_enum; Type: TYPE; Schema: public; Owner: -
          --
          CREATE TYPE "credits_status_enum" AS ENUM (
              'draft',
              'pre_approved',
              'rejected',
              'cancelled',
              'pending_signatures',
              'signed'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      --
      -- Name: credit_documents; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "credit_documents" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid NOT NULL,
          credit_id uuid NOT NULL,
          code character varying(50) NOT NULL,
          name character varying(200) NOT NULL,
          status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
          url character varying,
          signed_at timestamp without time zone,
          content_base64 text,
          content_mime character varying(50),
          content_sha256 character varying(64),
          ip character varying(45),
          user_agent text
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "credit_documents" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: credits; Type: TABLE; Schema: public; Owner: -
      --
      CREATE TABLE IF NOT EXISTS "credits" (
          id uuid DEFAULT uuid_generate_v4() NOT NULL,
          created_at timestamp without time zone DEFAULT now() NOT NULL,
          updated_at timestamp without time zone DEFAULT now() NOT NULL,
          deleted_at timestamp without time zone,
          company_id uuid NOT NULL,
          client_id uuid,
          status credits_status_enum DEFAULT 'draft'::credits_status_enum NOT NULL,
          application_number character varying(30),
          nit character varying(20),
          consent_data boolean DEFAULT false NOT NULL,
          approved_limit numeric(12,2),
          monthly_income numeric(14,2),
          monthly_expenses numeric(14,2),
          assets_value numeric(14,2),
          liabilities_value numeric(14,2),
          foundation_date date,
          signature_date timestamp without time zone,
          disbursement_date timestamp without time zone,
          study_answers jsonb,
          decision_at timestamp without time zone,
          decision_run_id character varying(100),
          vendor_id uuid,
          person_type credits_person_type_enum,
          years_experience integer,
          opportunity_value numeric(14,2),
          reliability_score integer,
          algorithm_result jsonb,
          algorithm_attempts integer DEFAULT 0 NOT NULL,
          algorithm_checked_at timestamp with time zone,
          signing_contact jsonb,
          CONSTRAINT "CHK_credits_opportunity_value" CHECK (((opportunity_value IS NULL) OR (opportunity_value >= (0)::numeric))),
          CONSTRAINT "CHK_credits_reliability_score" CHECK (((reliability_score IS NULL) OR ((reliability_score >= 1) AND (reliability_score <= 5)))),
          CONSTRAINT "CHK_credits_years_experience" CHECK (((years_experience IS NULL) OR (years_experience >= 0)))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "credits" FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: IDX_credit_documents_code; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "IDX_credit_documents_code" ON "credit_documents" USING btree (credit_id, code)
    `);

    await queryRunner.query(`
      --
      -- Name: IDX_credit_documents_credit; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "IDX_credit_documents_credit" ON "credit_documents" USING btree (credit_id)
    `);

    await queryRunner.query(`
      --
      -- Name: IDX_credits_company_status; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "IDX_credits_company_status" ON "credits" USING btree (company_id, status)
    `);

    await queryRunner.query(`
      --
      -- Name: IDX_credits_decision_run_id; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "IDX_credits_decision_run_id" ON "credits" USING btree (decision_run_id)
    `);

    await queryRunner.query(`
      --
      -- Name: IDX_credits_status; Type: INDEX; Schema: public; Owner: -
      --
      CREATE INDEX IF NOT EXISTS "IDX_credits_status" ON "credits" USING btree (status)
    `);

    await queryRunner.query(`
      --
      -- Name: UQ_credits_application_number; Type: INDEX; Schema: public; Owner: -
      --
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_credits_application_number" ON "credits" USING btree (application_number)
    `);

    await queryRunner.query(`
      --
      -- Name: credit_documents; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "credit_documents" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: credits; Type: ROW SECURITY; Schema: public; Owner: -
      --
      ALTER TABLE "credits" ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      --
      -- Name: credit_documents tenant_isolation_credit_documents; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_credit_documents" ON "credit_documents";
      CREATE POLICY "tenant_isolation_credit_documents" ON "credit_documents" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      --
      -- Name: credits tenant_isolation_credits; Type: POLICY; Schema: public; Owner: -
      --
      DROP POLICY IF EXISTS "tenant_isolation_credits" ON "credits";
      CREATE POLICY "tenant_isolation_credits" ON "credits" USING ((company_id = (current_setting('app.current_company_id'::text, true))::uuid)) WITH CHECK ((company_id = (current_setting('app.current_company_id'::text, true))::uuid))
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_45cea097fd0ee625d2e840ed99c') THEN
          --
          -- Name: credits PK_45cea097fd0ee625d2e840ed99c; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "credits" ADD CONSTRAINT "PK_45cea097fd0ee625d2e840ed99c" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_7252924d0939c77f906021929fa') THEN
          --
          -- Name: credits FK_7252924d0939c77f906021929fa; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "credits" ADD CONSTRAINT "FK_7252924d0939c77f906021929fa" FOREIGN KEY (client_id) REFERENCES clients(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_f18a37d58eb0d5b6fb4e72c8e08') THEN
          --
          -- Name: credits FK_f18a37d58eb0d5b6fb4e72c8e08; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "credits" ADD CONSTRAINT "FK_f18a37d58eb0d5b6fb4e72c8e08" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PK_credit_documents') THEN
          --
          -- Name: credit_documents PK_credit_documents; Type: CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "credit_documents" ADD CONSTRAINT "PK_credit_documents" PRIMARY KEY (id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_credit_documents_company') THEN
          --
          -- Name: credit_documents FK_credit_documents_company; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "credit_documents" ADD CONSTRAINT "FK_credit_documents_company" FOREIGN KEY (company_id) REFERENCES companies(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_credit_documents_credit') THEN
          --
          -- Name: credit_documents FK_credit_documents_credit; Type: FK CONSTRAINT; Schema: public; Owner: -
          --
          ALTER TABLE "credit_documents" ADD CONSTRAINT "FK_credit_documents_credit" FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op intencional: revertir un baseline con datos de producción es destructivo.
  }
}
