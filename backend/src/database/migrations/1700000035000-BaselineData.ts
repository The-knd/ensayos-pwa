import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";
import { demoPassword } from "../seed-helpers";

/**
 * Baseline de datos: semilla final consolidada.
 *
 * Reproduce el estado final de las 34 migraciones originales (más las dos
 * migraciones de créditos/trigramas renumeradas a 1700000037000/38000) en una
 * sola migración. Todos los INSERT usan ON CONFLICT DO NOTHING para ser
 * idempotentes en entornos que ya tengan datos.
 */
export class BaselineData1700000035000 implements MigrationInterface {
  name = "BaselineData1700000035000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Companies
    await queryRunner.query(`
      INSERT INTO companies (id, created_at, updated_at, deleted_at, name, logo_url, primary_color, auth_strategy, is_active) VALUES
        ('11111111-1111-1111-8111-111111111111', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'Herragro', NULL, '#1565C0', 'local', true),
        ('22222222-2222-2222-8222-222222222222', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'Adylog', NULL, '#E2602B', 'local', true),
        ('33333333-3333-3333-8333-333333333333', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'Toptec', NULL, '#27AE60', 'local', true)
      ON CONFLICT DO NOTHING;
    `);

    // Permissions
    await queryRunner.query(`
      INSERT INTO permissions (id, created_at, updated_at, deleted_at, resource, action, condition, code) VALUES
        ('8058afa7-00eb-4187-9ec0-6a6517940299', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'config', 'read', NULL, 'config.read'),
        ('1cf95763-a7ca-4a3d-9a53-6a9e1552c310', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'config', 'create', NULL, 'config.create'),
        ('3f8b778e-dde8-4fc3-82bb-82ce7ff82b10', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'config', 'update', NULL, 'config.update'),
        ('f83dd06a-377e-4847-93dc-d51a2894ceed', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'config', 'delete', NULL, 'config.delete'),
        ('17acdaee-1e2f-493d-9d3a-35d68f9d035f', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'clients', 'read', NULL, 'clients.read'),
        ('4aeaf837-d78a-49dc-a8c9-381b17d7002a', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'clients', 'create', NULL, 'clients.create'),
        ('1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'clients', 'update', NULL, 'clients.update'),
        ('25052f30-b2ef-42fc-93a6-825c85aca313', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'clients', 'delete', NULL, 'clients.delete'),
        ('d45765bc-0ed0-48e7-9d8a-1541a0498c52', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'users', 'read', NULL, 'users.read'),
        ('a25e27e3-0f75-4003-abbf-32d48cb89d6c', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'users', 'create', NULL, 'users.create'),
        ('a342f98e-ea55-4dcf-928d-844f799d5e7f', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'users', 'update', NULL, 'users.update'),
        ('667a544c-2e49-4f99-8954-dd316c8fa792', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'users', 'delete', NULL, 'users.delete'),
        ('21748169-de7a-4e29-80aa-cd38a4f88568', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'credits', 'read', NULL, 'credits.read'),
        ('e0747224-d0ab-4f83-b62e-211fd413309a', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'credits', 'create', NULL, 'credits.create'),
        ('9a672e4c-d79f-4e4c-b878-0ef390d7387c', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'credits', 'update', NULL, 'credits.update'),
        ('d61c666b-41aa-46f4-8803-6854c2562067', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'credits', 'delete', NULL, 'credits.delete'),
        ('544cb514-ccf0-4305-ae05-c7ca991a9a30', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'credits', 'study', NULL, 'credits.study'),
        ('edb2c1e1-3536-4834-a556-bd008434ff95', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'feature-flags', 'read', NULL, 'feature-flags.read'),
        ('0594be41-5e8f-4cf2-bb61-51e1ae3a062c', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'feature-flags', 'create', NULL, 'feature-flags.create'),
        ('3ef9051a-fb4b-439f-be2b-d97dcfbb36ec', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'feature-flags', 'update', NULL, 'feature-flags.update'),
        ('08df3847-85a3-493d-b79b-b144f99f03cf', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'feature-flags', 'delete', NULL, 'feature-flags.delete'),
        ('a6622262-cea7-456a-8ea3-2d3a9b3c9f0f', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'profiles', 'read', NULL, 'profiles.read'),
        ('2bb83073-7d16-4bd3-a2fc-d9e6bbc7ce0b', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'profiles', 'create', NULL, 'profiles.create'),
        ('a6b879bd-e9e9-4480-9dc3-84be57d553fa', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'profiles', 'update', NULL, 'profiles.update'),
        ('76bf63e9-ab24-456d-9e57-22081a983cbb', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, 'profiles', 'delete', NULL, 'profiles.delete')
      ON CONFLICT DO NOTHING;
    `);

    // Profiles
    await queryRunner.query(`
      INSERT INTO profiles (id, created_at, updated_at, deleted_at, company_id, name, is_system_role) VALUES
        ('aaaaaaaa-0000-4000-8000-000000000001', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'super_admin', true),
        ('aaaaaaaa-0000-4000-8000-000000000002', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'admin', true),
        ('aaaaaaaa-0000-4000-8000-000000000003', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'vendedor', true),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '22222222-2222-2222-8222-222222222222', 'admin', true),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '33333333-3333-3333-8333-333333333333', 'admin', true),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '11111111-1111-1111-8111-111111111111', 'admin', true),
        ('76ce856a-5437-4103-9189-538221c94ba0', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '22222222-2222-2222-8222-222222222222', 'vendedor', true),
        ('4282ca46-f2bc-46b3-bfa6-b66fb9794c3f', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '33333333-3333-3333-8333-333333333333', 'vendedor', true),
        ('4f9bc638-77be-40fd-b4d5-003162054837', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '11111111-1111-1111-8111-111111111111', 'vendedor', true)
      ON CONFLICT DO NOTHING;
    `);

    // Profile permissions
    await queryRunner.query(`
      INSERT INTO profile_permissions (profile_id, permission_id) VALUES
        ('aaaaaaaa-0000-4000-8000-000000000001', '8058afa7-00eb-4187-9ec0-6a6517940299'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '1cf95763-a7ca-4a3d-9a53-6a9e1552c310'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '3f8b778e-dde8-4fc3-82bb-82ce7ff82b10'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'f83dd06a-377e-4847-93dc-d51a2894ceed'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'd45765bc-0ed0-48e7-9d8a-1541a0498c52'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'a25e27e3-0f75-4003-abbf-32d48cb89d6c'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'a342f98e-ea55-4dcf-928d-844f799d5e7f'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '667a544c-2e49-4f99-8954-dd316c8fa792'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'e0747224-d0ab-4f83-b62e-211fd413309a'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '9a672e4c-d79f-4e4c-b878-0ef390d7387c'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'd61c666b-41aa-46f4-8803-6854c2562067'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'd45765bc-0ed0-48e7-9d8a-1541a0498c52'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'a25e27e3-0f75-4003-abbf-32d48cb89d6c'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'a342f98e-ea55-4dcf-928d-844f799d5e7f'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '667a544c-2e49-4f99-8954-dd316c8fa792'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'e0747224-d0ab-4f83-b62e-211fd413309a'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '9a672e4c-d79f-4e4c-b878-0ef390d7387c'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'd61c666b-41aa-46f4-8803-6854c2562067'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('aaaaaaaa-0000-4000-8000-000000000003', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('aaaaaaaa-0000-4000-8000-000000000003', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('aaaaaaaa-0000-4000-8000-000000000003', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('aaaaaaaa-0000-4000-8000-000000000003', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('aaaaaaaa-0000-4000-8000-000000000003', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('aaaaaaaa-0000-4000-8000-000000000003', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'edb2c1e1-3536-4834-a556-bd008434ff95'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '0594be41-5e8f-4cf2-bb61-51e1ae3a062c'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '3ef9051a-fb4b-439f-be2b-d97dcfbb36ec'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '08df3847-85a3-493d-b79b-b144f99f03cf'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'edb2c1e1-3536-4834-a556-bd008434ff95'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '0594be41-5e8f-4cf2-bb61-51e1ae3a062c'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '3ef9051a-fb4b-439f-be2b-d97dcfbb36ec'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'a6622262-cea7-456a-8ea3-2d3a9b3c9f0f'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '2bb83073-7d16-4bd3-a2fc-d9e6bbc7ce0b'),
        ('aaaaaaaa-0000-4000-8000-000000000001', 'a6b879bd-e9e9-4480-9dc3-84be57d553fa'),
        ('aaaaaaaa-0000-4000-8000-000000000001', '76bf63e9-ab24-456d-9e57-22081a983cbb'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'a6622262-cea7-456a-8ea3-2d3a9b3c9f0f'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '2bb83073-7d16-4bd3-a2fc-d9e6bbc7ce0b'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'a6b879bd-e9e9-4480-9dc3-84be57d553fa'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '8058afa7-00eb-4187-9ec0-6a6517940299'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '1cf95763-a7ca-4a3d-9a53-6a9e1552c310'),
        ('aaaaaaaa-0000-4000-8000-000000000002', '3f8b778e-dde8-4fc3-82bb-82ce7ff82b10'),
        ('aaaaaaaa-0000-4000-8000-000000000002', 'f83dd06a-377e-4847-93dc-d51a2894ceed'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'd45765bc-0ed0-48e7-9d8a-1541a0498c52'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'a25e27e3-0f75-4003-abbf-32d48cb89d6c'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'a342f98e-ea55-4dcf-928d-844f799d5e7f'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '667a544c-2e49-4f99-8954-dd316c8fa792'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'e0747224-d0ab-4f83-b62e-211fd413309a'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '9a672e4c-d79f-4e4c-b878-0ef390d7387c'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'd61c666b-41aa-46f4-8803-6854c2562067'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'edb2c1e1-3536-4834-a556-bd008434ff95'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '0594be41-5e8f-4cf2-bb61-51e1ae3a062c'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '3ef9051a-fb4b-439f-be2b-d97dcfbb36ec'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'a6622262-cea7-456a-8ea3-2d3a9b3c9f0f'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '2bb83073-7d16-4bd3-a2fc-d9e6bbc7ce0b'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'a6b879bd-e9e9-4480-9dc3-84be57d553fa'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '8058afa7-00eb-4187-9ec0-6a6517940299'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '1cf95763-a7ca-4a3d-9a53-6a9e1552c310'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', '3f8b778e-dde8-4fc3-82bb-82ce7ff82b10'),
        ('a80321d2-3274-406d-a796-4878b4ac36a2', 'f83dd06a-377e-4847-93dc-d51a2894ceed'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'd45765bc-0ed0-48e7-9d8a-1541a0498c52'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'a25e27e3-0f75-4003-abbf-32d48cb89d6c'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'a342f98e-ea55-4dcf-928d-844f799d5e7f'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '667a544c-2e49-4f99-8954-dd316c8fa792'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'e0747224-d0ab-4f83-b62e-211fd413309a'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '9a672e4c-d79f-4e4c-b878-0ef390d7387c'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'd61c666b-41aa-46f4-8803-6854c2562067'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'edb2c1e1-3536-4834-a556-bd008434ff95'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '0594be41-5e8f-4cf2-bb61-51e1ae3a062c'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '3ef9051a-fb4b-439f-be2b-d97dcfbb36ec'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'a6622262-cea7-456a-8ea3-2d3a9b3c9f0f'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '2bb83073-7d16-4bd3-a2fc-d9e6bbc7ce0b'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'a6b879bd-e9e9-4480-9dc3-84be57d553fa'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '8058afa7-00eb-4187-9ec0-6a6517940299'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '1cf95763-a7ca-4a3d-9a53-6a9e1552c310'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', '3f8b778e-dde8-4fc3-82bb-82ce7ff82b10'),
        ('039a533d-b231-4aa5-a02a-495497a46c42', 'f83dd06a-377e-4847-93dc-d51a2894ceed'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'd45765bc-0ed0-48e7-9d8a-1541a0498c52'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'a25e27e3-0f75-4003-abbf-32d48cb89d6c'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'a342f98e-ea55-4dcf-928d-844f799d5e7f'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '667a544c-2e49-4f99-8954-dd316c8fa792'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'e0747224-d0ab-4f83-b62e-211fd413309a'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '9a672e4c-d79f-4e4c-b878-0ef390d7387c'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'd61c666b-41aa-46f4-8803-6854c2562067'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'edb2c1e1-3536-4834-a556-bd008434ff95'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '0594be41-5e8f-4cf2-bb61-51e1ae3a062c'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '3ef9051a-fb4b-439f-be2b-d97dcfbb36ec'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'a6622262-cea7-456a-8ea3-2d3a9b3c9f0f'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '2bb83073-7d16-4bd3-a2fc-d9e6bbc7ce0b'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'a6b879bd-e9e9-4480-9dc3-84be57d553fa'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '8058afa7-00eb-4187-9ec0-6a6517940299'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '1cf95763-a7ca-4a3d-9a53-6a9e1552c310'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', '3f8b778e-dde8-4fc3-82bb-82ce7ff82b10'),
        ('7e4a612c-806c-4d96-b1f8-9d55571fb57f', 'f83dd06a-377e-4847-93dc-d51a2894ceed'),
        ('76ce856a-5437-4103-9189-538221c94ba0', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('76ce856a-5437-4103-9189-538221c94ba0', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('76ce856a-5437-4103-9189-538221c94ba0', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('76ce856a-5437-4103-9189-538221c94ba0', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('76ce856a-5437-4103-9189-538221c94ba0', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('76ce856a-5437-4103-9189-538221c94ba0', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('4282ca46-f2bc-46b3-bfa6-b66fb9794c3f', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('4282ca46-f2bc-46b3-bfa6-b66fb9794c3f', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('4282ca46-f2bc-46b3-bfa6-b66fb9794c3f', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('4282ca46-f2bc-46b3-bfa6-b66fb9794c3f', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('4282ca46-f2bc-46b3-bfa6-b66fb9794c3f', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('4282ca46-f2bc-46b3-bfa6-b66fb9794c3f', '544cb514-ccf0-4305-ae05-c7ca991a9a30'),
        ('4f9bc638-77be-40fd-b4d5-003162054837', '17acdaee-1e2f-493d-9d3a-35d68f9d035f'),
        ('4f9bc638-77be-40fd-b4d5-003162054837', '4aeaf837-d78a-49dc-a8c9-381b17d7002a'),
        ('4f9bc638-77be-40fd-b4d5-003162054837', '1de40111-fdbb-4fe3-9bc2-2ba5a7cb884a'),
        ('4f9bc638-77be-40fd-b4d5-003162054837', '25052f30-b2ef-42fc-93a6-825c85aca313'),
        ('4f9bc638-77be-40fd-b4d5-003162054837', '21748169-de7a-4e29-80aa-cd38a4f88568'),
        ('4f9bc638-77be-40fd-b4d5-003162054837', '544cb514-ccf0-4305-ae05-c7ca991a9a30')
      ON CONFLICT DO NOTHING;
    `);

    // Demo users (hashed password from SEED_DEMO_PASSWORD)
    if (process.env.SEED_DEMO_DATA !== "false") {
      const passwordHash = await bcrypt.hash(demoPassword(), 12);
      await queryRunner.query(
        `
        INSERT INTO users (id, company_id, profile_id, email, password_hash, status, full_name) VALUES
          ('u0000000-0000-4000-8000-000000000001', NULL, (SELECT id FROM profiles WHERE name = 'super_admin' AND company_id IS NULL), 'superadmin@empresa1.com', $1, 'active', 'Super Admin Uno'),
          ('u0000000-0000-4000-8000-000000000002', '11111111-1111-1111-8111-111111111111', (SELECT id FROM profiles WHERE name = 'admin' AND company_id = '11111111-1111-1111-8111-111111111111'), 'admin@empresa1.com', $1, 'active', 'Admin Uno'),
          ('u0000000-0000-4000-8000-000000000003', '11111111-1111-1111-8111-111111111111', (SELECT id FROM profiles WHERE name = 'vendedor' AND company_id = '11111111-1111-1111-8111-111111111111'), 'vendedor@empresa1.com', $1, 'active', 'Vendedor Uno'),
          ('u0000000-0000-4000-8000-000000000004', NULL, (SELECT id FROM profiles WHERE name = 'super_admin' AND company_id IS NULL), 'superadmin@empresa2.com', $1, 'active', 'Super Admin Dos'),
          ('u0000000-0000-4000-8000-000000000005', '22222222-2222-2222-8222-222222222222', (SELECT id FROM profiles WHERE name = 'admin' AND company_id = '22222222-2222-2222-8222-222222222222'), 'admin@empresa2.com', $1, 'active', 'Admin Dos'),
          ('u0000000-0000-4000-8000-000000000006', '22222222-2222-2222-8222-222222222222', (SELECT id FROM profiles WHERE name = 'vendedor' AND company_id = '22222222-2222-2222-8222-222222222222'), 'vendedor@empresa2.com', $1, 'active', 'Vendedor Dos'),
          ('u0000000-0000-4000-8000-000000000007', NULL, (SELECT id FROM profiles WHERE name = 'super_admin' AND company_id IS NULL), 'superadmin@empresa3.com', $1, 'active', 'Super Admin Tres'),
          ('u0000000-0000-4000-8000-000000000008', '33333333-3333-3333-8333-333333333333', (SELECT id FROM profiles WHERE name = 'admin' AND company_id = '33333333-3333-3333-8333-333333333333'), 'admin@empresa3.com', $1, 'active', 'Admin Tres'),
          ('u0000000-0000-4000-8000-000000000009', '33333333-3333-3333-8333-333333333333', (SELECT id FROM profiles WHERE name = 'vendedor' AND company_id = '33333333-3333-3333-8333-333333333333'), 'vendedor@empresa3.com', $1, 'active', 'Vendedor Tres')
        ON CONFLICT (email) DO NOTHING
      `,
        [passwordHash],
      );
    }

    // Feature flags
    await queryRunner.query(`
      INSERT INTO feature_flags (id, created_at, updated_at, deleted_at, company_id, user_id, key, enabled) VALUES
        ('ba5bb24b-c580-49f7-9d6f-dcf44a847a7e', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '11111111-1111-1111-8111-111111111111', NULL, 'module.credits', true),
        ('e0db26a5-e85c-4a07-9a49-c425b64623a6', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '22222222-2222-2222-8222-222222222222', NULL, 'module.credits', true),
        ('e0aa83a4-5c0f-4104-a90d-66c1802ff0f8', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, '33333333-3333-3333-8333-333333333333', NULL, 'module.credits', true)
      ON CONFLICT DO NOTHING;
    `);

    // Modules
    await queryRunner.query(`
      INSERT INTO modules (id, created_at, updated_at, deleted_at, company_id, key, module, label, icon, path, operations, flag, enabled) VALUES
        ('8cb58b42-d609-40c8-a59e-b263bb6befda', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '11111111-1111-1111-8111-111111111111', 'cliente', 'clients', 'Cliente', NULL, '/clients', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('02ac400b-353a-4f42-8410-56f3ac455b19', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '11111111-1111-1111-8111-111111111111', 'crear', 'clients', 'Crear cliente', NULL, '/clients/new', '[{"name": "Crear", "action": "create"}]', NULL, true),
        ('3eac4ae1-4026-4bca-aa86-c4871049f4e2', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '11111111-1111-1111-8111-111111111111', 'usuarios', 'users', 'Usuarios', NULL, '/users', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('c5c1a416-82d5-4468-9cb5-17e0797cf4aa', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '11111111-1111-1111-8111-111111111111', 'perfiles', 'profiles', 'Perfiles', NULL, '/profiles', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('fbbcbb37-6d60-494e-a296-7cc68115826e', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '11111111-1111-1111-8111-111111111111', 'config', 'config', 'Configuración', NULL, '/config', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('b35fe7f8-b133-4eed-9994-f12304a37ff3', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '22222222-2222-2222-8222-222222222222', 'cliente', 'clients', 'Cliente', NULL, '/clients', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('8cd58f11-4d85-41f4-ba4f-076e7a9a6099', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '22222222-2222-2222-8222-222222222222', 'crear', 'clients', 'Crear cliente', NULL, '/clients/new', '[{"name": "Crear", "action": "create"}]', NULL, true),
        ('9032e9ef-b074-435d-bdc4-a333593658ab', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '22222222-2222-2222-8222-222222222222', 'creditos', 'credits', 'Créditos', NULL, '/credits', '[{"name": "Leer", "action": "read"}]', 'module.credits', true),
        ('19f1dadd-697b-408a-9177-20f3f5501d47', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '22222222-2222-2222-8222-222222222222', 'usuarios', 'users', 'Usuarios', NULL, '/users', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('da5f0641-8c8f-468f-baa7-bb49562b73db', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '22222222-2222-2222-8222-222222222222', 'perfiles', 'profiles', 'Perfiles', NULL, '/profiles', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('2267a320-4256-47c1-84f2-dcce6ff83cee', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '22222222-2222-2222-8222-222222222222', 'config', 'config', 'Configuración', NULL, '/config', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('c4e1b055-cf85-4e7a-8760-64628d750c7e', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '33333333-3333-3333-8333-333333333333', 'cliente', 'clients', 'Cliente', NULL, '/clients', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('1b03be0e-01f0-4229-94bb-03e766df1798', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '33333333-3333-3333-8333-333333333333', 'crear', 'clients', 'Crear cliente', NULL, '/clients/new', '[{"name": "Crear", "action": "create"}]', NULL, true),
        ('afacb0d5-5bf8-44b2-822b-babcf16a2eeb', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '33333333-3333-3333-8333-333333333333', 'usuarios', 'users', 'Usuarios', NULL, '/users', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('d21d6f77-c9d9-4c65-ab4f-3b998d12ab40', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '33333333-3333-3333-8333-333333333333', 'perfiles', 'profiles', 'Perfiles', NULL, '/profiles', '[{"name": "Leer", "action": "read"}]', NULL, true),
        ('b433c111-c70d-4895-a503-6325c0d3f322', '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00', NULL, '33333333-3333-3333-8333-333333333333', 'config', 'config', 'Configuración', NULL, '/config', '[{"name": "Leer", "action": "read"}]', NULL, true)
      ON CONFLICT DO NOTHING;
    `);

    // Module assignments
    await queryRunner.query(`
      INSERT INTO module_assignments (module_id, company_id, placement, "position", enabled, created_at, updated_at) VALUES
        ('8cb58b42-d609-40c8-a59e-b263bb6befda', '11111111-1111-1111-8111-111111111111', 'grid', 1, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('02ac400b-353a-4f42-8410-56f3ac455b19', '11111111-1111-1111-8111-111111111111', 'grid', 2, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('3eac4ae1-4026-4bca-aa86-c4871049f4e2', '11111111-1111-1111-8111-111111111111', 'grid', 4, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('c5c1a416-82d5-4468-9cb5-17e0797cf4aa', '11111111-1111-1111-8111-111111111111', 'grid', 5, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('fbbcbb37-6d60-494e-a296-7cc68115826e', '11111111-1111-1111-8111-111111111111', 'grid', 6, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('b35fe7f8-b133-4eed-9994-f12304a37ff3', '22222222-2222-2222-8222-222222222222', 'grid', 1, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('8cd58f11-4d85-41f4-ba4f-076e7a9a6099', '22222222-2222-2222-8222-222222222222', 'grid', 2, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('19f1dadd-697b-408a-9177-20f3f5501d47', '22222222-2222-2222-8222-222222222222', 'grid', 4, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('da5f0641-8c8f-468f-baa7-bb49562b73db', '22222222-2222-2222-8222-222222222222', 'grid', 5, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('2267a320-4256-47c1-84f2-dcce6ff83cee', '22222222-2222-2222-8222-222222222222', 'grid', 6, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('c4e1b055-cf85-4e7a-8760-64628d750c7e', '33333333-3333-3333-8333-333333333333', 'grid', 1, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('1b03be0e-01f0-4229-94bb-03e766df1798', '33333333-3333-3333-8333-333333333333', 'grid', 2, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('afacb0d5-5bf8-44b2-822b-babcf16a2eeb', '33333333-3333-3333-8333-333333333333', 'grid', 4, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('d21d6f77-c9d9-4c65-ab4f-3b998d12ab40', '33333333-3333-3333-8333-333333333333', 'grid', 5, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('b433c111-c70d-4895-a503-6325c0d3f322', '33333333-3333-3333-8333-333333333333', 'grid', 6, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('9032e9ef-b074-435d-bdc4-a333593658ab', '22222222-2222-2222-8222-222222222222', 'grid', 3, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('9032e9ef-b074-435d-bdc4-a333593658ab', '11111111-1111-1111-8111-111111111111', 'grid', 3, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('9032e9ef-b074-435d-bdc4-a333593658ab', '33333333-3333-3333-8333-333333333333', 'grid', 3, true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00')
      ON CONFLICT DO NOTHING;
    `);

    // Clients (shared padron)
    await queryRunner.query(`
      INSERT INTO clients (id, created_at, updated_at, deleted_at, company_id, full_name, document_number, phone, email, status, document_type, dv, person_type, commercial_name, first_name, second_name, first_last_name, second_last_name, legal_name, rep_first_name, rep_second_name, rep_first_last_name, rep_second_last_name, economic_activity_code, economic_activity_description, billing_email, treasury_email, establishment_vocation, establishment_size, service_type, public_office, public_office_cargo, public_office_start, public_office_end, foreign_accounts, public_resource_management, foreign_trade, foreign_trade_ops_per_year, payment_method, payment_method_other, merchandise_description, capital_registered, funds_origin, jur_public_office, jur_public_resource_management, jur_foreign_trade) VALUES
        ('dddd0001-0000-4000-8000-000000000001', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'RIVERO GOMEZ ORLANDO', '91067726', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Orlando Rivero', 'Orlando', NULL, 'Rivero', 'Gomez', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0003-0000-4000-8000-000000000003', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'DIAZ BOLAÑO DAVID SANTIAGO', '1083020601', NULL, NULL, 'active', 'cc', NULL, 'natural', 'David Diaz', 'David', 'Santiago', 'Diaz', 'Bolaño', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0004-0000-4000-8000-000000000004', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'CLAVIJO OVALLE ANGIE CAROLINA', '1073160315', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Angie Clavijo', 'Angie', 'Carolina', 'Clavijo', 'Ovalle', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0005-0000-4000-8000-000000000005', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'GOMEZ CARDONA SIRLEY LILIANA', '43922106', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Sirley Gomez', 'Sirley', 'Liliana', 'Gomez', 'Cardona', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0006-0000-4000-8000-000000000006', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'RINCON LEON JIMMY ALEXANDER', '11276427', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Jimmy Rincon', 'Jimmy', 'Alexander', 'Rincon', 'Leon', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0007-0000-4000-8000-000000000007', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'OJEDA RODRIGUEZ CARLOS ARTURO', '19301587', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Carlos Ojeda', 'Carlos', 'Arturo', 'Ojeda', 'Rodriguez', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0008-0000-4000-8000-000000000008', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'MURCIA DIAZ LUCERO', '52183825', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Lucero Murcia', 'Lucero', NULL, 'Murcia', 'Diaz', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0009-0000-4000-8000-000000000009', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'ALVARADO ALVARADO JORGE HUMBERTO', '79237113', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Jorge Alvarado', 'Jorge', 'Humberto', 'Alvarado', 'Alvarado', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0010-0000-4000-8000-000000000010', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'PINEDA ROMERO ANGELICA MARIA', '52788673', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Angelica Pineda', 'Angelica', 'Maria', 'Pineda', 'Romero', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0011-0000-4000-8000-000000000011', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'ESPINOSA MACIAS PABLO ENRIQUE', '1019017240', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Pablo Espinosa', 'Pablo', 'Enrique', 'Espinosa', 'Macias', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0012-0000-4000-8000-000000000012', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'RODRIGUEZ COQUECO ERIKA JOHANNA', '1014212939', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Erika Rodriguez', 'Erika', 'Johanna', 'Rodriguez', 'Coqueco', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0013-0000-4000-8000-000000000013', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'CASTELLANOS WITTINGHAN CARLOS ANDRES', '80723560', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Carlos Castellanos', 'Carlos', 'Andres', 'Castellanos', 'Wittinghan', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0014-0000-4000-8000-000000000014', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'MEDINA DUQUE ANA MARIA', '42152759', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Ana Medina', 'Ana', 'Maria', 'Medina', 'Duque', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0015-0000-4000-8000-000000000015', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'GUERRERO ALZATE ILDA MERY', '66961271', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Ilda Guerrero', 'Ilda', 'Mery', 'Guerrero', 'Alzate', NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0016-0000-4000-8000-000000000016', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'HERRERA SANDRA MILENA', '29831610', NULL, NULL, 'active', 'cc', NULL, 'natural', 'Sandra Herrera', 'Sandra', 'Milena', 'Herrera', NULL, NULL, NULL, NULL, NULL, NULL, '4711', 'Comercio al por menor en establecimientos no especializados', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0002-0000-4000-8000-000000000002', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'INVERSIONES CONSTRUFACIL SAS', '9016336369', NULL, NULL, 'active', 'nit', '9', 'juridica', 'INVERSIONES CONSTRUFACIL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '4291', 'Almacenamiento de materiales para construcción', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ('dddd0017-0000-4000-8000-000000000017', '2026-10-21 22:26:20.732259', '2026-10-21 22:26:20.732259', NULL, NULL, 'DISTRISOLLA FILANDIA SAS', '9014902765', NULL, NULL, 'active', 'nit', '5', 'juridica', 'DISTRISOLLA FILANDIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '4665', 'Venta al por mayor de alimentos', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
      ON CONFLICT DO NOTHING;
    `);

    // Connection systems
    await queryRunner.query(`
      INSERT INTO connection_systems (key, label, enabled, sort_order, created_at, updated_at) VALUES
        ('sap', 'SAP Business One', true, 10, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('api', 'API genérica', true, 20, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00'),
        ('copilot-chat-agent', 'Copilot Chat Agent', true, 30, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00')
      ON CONFLICT DO NOTHING;
    `);

    // Connection templates
    await queryRunner.query(`
      INSERT INTO connection_templates (id, system_key, label, settings_fields, secret_fields, auth_type, enabled, created_at, updated_at) VALUES
        ('be64e5f3-4cbf-4456-a6c2-0268a4d6397d', 'sap', 'SAP Business One (clientes)', '[{"key": "strategy", "type": "select", "label": "Estrategia", "default": "sap-b1", "options": ["sap-b1", "sap-b1-empresa1", "sap-b1-empresa2"], "required": true}, {"key": "companyDb", "type": "text", "label": "Base de la compañía (CompanyDB)", "required": true}, {"key": "cardType", "type": "select", "label": "Tipo de socio", "options": ["cCustomer", "cLid"], "required": false}, {"key": "pageSize", "type": "number", "label": "Registros por página", "default": 200, "required": false, "operational": true}, {"key": "schedule", "type": "json", "label": "Sincronización programada", "required": false, "operational": true}, {"key": "ownedFields", "type": "multiselect", "label": "Datos que manda el sistema", "options": ["fullName", "commercialName", "legalName", "billingEmail", "phone", "email", "status"], "required": false, "operational": true}]', '[{"key": "username", "label": "Usuario", "required": true}, {"key": "password", "label": "Contraseña", "required": true}]', 'session', true, '2026-10-21 22:26:20.732259+00', '2026-10-21 22:26:20.732259+00')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op intencional: revertir un baseline con datos de producción es destructivo.
  }
}
