import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientFieldsSchemas1700000003000 implements MigrationInterface {
    name = 'ClientFieldsSchemas1700000003000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."clients_person_type_enum" AS ENUM('natural', 'juridica')`);
        await queryRunner.query(`CREATE TYPE "public"."clients_document_type_enum" AS ENUM('nit', 'cc', 'ce', 'pp')`);

        await queryRunner.query(`ALTER TABLE "clients" ADD "document_type" "public"."clients_document_type_enum"`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "dv" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "person_type" "public"."clients_person_type_enum"`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "commercial_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "first_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "second_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "first_last_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "second_last_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "legal_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "rep_first_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "rep_second_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "rep_first_last_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "rep_second_last_name" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "economic_activity_code" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "economic_activity_description" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "billing_email" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "treasury_email" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "establishment_vocation" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "establishment_size" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "service_type" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "public_office" boolean`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "public_office_cargo" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "public_office_start" date`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "public_office_end" date`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "foreign_accounts" boolean`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "public_resource_management" boolean`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "foreign_trade" boolean`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "foreign_trade_ops_per_year" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "payment_method" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "payment_method_other" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "merchandise_description" text`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "capital_registered" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "funds_origin" character varying`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "jur_public_office" boolean`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "jur_public_resource_management" boolean`);
        await queryRunner.query(`ALTER TABLE "clients" ADD "jur_foreign_trade" boolean`);

        await queryRunner.query(`CREATE TYPE "public"."client_directions_type_enum" AS ENUM('principal', 'despacho')`);
        await queryRunner.query(`CREATE TABLE "client_directions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "company_id" uuid NOT NULL, "client_id" uuid NOT NULL, "type" "public"."client_directions_type_enum" NOT NULL, "address" character varying, "department" character varying, "city" character varying, "postal_code" character varying, "phone" character varying, "contact_first_name" character varying, "contact_second_name" character varying, "contact_first_last_name" character varying, "contact_second_last_name" character varying, "description" text, CONSTRAINT "PK_client_directions" PRIMARY KEY ("id"))`);

        await queryRunner.query(`CREATE TABLE "client_references" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "company_id" uuid NOT NULL, "client_id" uuid NOT NULL, "sequence" integer NOT NULL, "entity" character varying, "address" character varying, "department" character varying, "city" character varying, "phone" character varying, "credit_limit" character varying, CONSTRAINT "PK_client_references" PRIMARY KEY ("id"))`);

        await queryRunner.query(`ALTER TABLE "client_directions" ADD CONSTRAINT "FK_client_directions_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_directions" ADD CONSTRAINT "FK_client_directions_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_references" ADD CONSTRAINT "FK_client_references_company" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_references" ADD CONSTRAINT "FK_client_references_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_references" DROP CONSTRAINT "FK_client_references_client"`);
        await queryRunner.query(`ALTER TABLE "client_references" DROP CONSTRAINT "FK_client_references_company"`);
        await queryRunner.query(`ALTER TABLE "client_directions" DROP CONSTRAINT "FK_client_directions_client"`);
        await queryRunner.query(`ALTER TABLE "client_directions" DROP CONSTRAINT "FK_client_directions_company"`);
        await queryRunner.query(`DROP TABLE "client_references"`);
        await queryRunner.query(`DROP TYPE "public"."client_directions_type_enum"`);
        await queryRunner.query(`DROP TABLE "client_directions"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "jur_foreign_trade"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "jur_public_resource_management"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "jur_public_office"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "funds_origin"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "capital_registered"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "merchandise_description"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "payment_method_other"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "payment_method"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "foreign_trade_ops_per_year"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "foreign_trade"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "public_resource_management"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "foreign_accounts"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "public_office_end"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "public_office_start"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "public_office_cargo"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "public_office"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "service_type"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "establishment_size"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "establishment_vocation"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "treasury_email"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "billing_email"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "economic_activity_description"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "economic_activity_code"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "rep_second_last_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "rep_first_last_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "rep_second_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "rep_first_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "legal_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "second_last_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "first_last_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "second_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "first_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "commercial_name"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "person_type"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "dv"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "document_type"`);
        await queryRunner.query(`DROP TYPE "public"."clients_document_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."clients_person_type_enum"`);
    }

}