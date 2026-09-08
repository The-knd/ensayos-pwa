import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Datos de prueba: 5 clientes (3 jurídicas + 2 naturales) con sus direcciones
 * y referencias comerciales, repartidos entre las empresas 1 y 2 del seed base
 * (`SeedBaseData`). Es la versión migrada de `bd/init/seed-clients.sql`.
 *
 * Importante — UUIDs corregidos: el .sql original usaba IDs "legibles" a mano
 * (`aaaaaaaa-...-aaaaaaaaaaNN`, `bbbb0001-...`, `cccc0001-...`) que Postgres
 * acepta en una columna uuid pero que NO son válidos para `class-validator`
 * (`@IsUUID()` exige nibble de versión 1-5 y de variante 8-b). Esto causó un
 * incidente real: `POST /credits/study` rechazaba con "clientId must be a
 * uuid" para estos clientes. Aquí se mantiene el mismo patrón legible pero
 * con los nibbles corregidos (versión 4, variante 8), p. ej.
 * `aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa01`.
 *
 * Estos IDs de `clients` coinciden a propósito con los que ya quedaron
 * corregidos en caliente en las bases de dev existentes (mismo hotfix
 * aplicado antes de escribir esta migración), para que el
 * `ON CONFLICT (id) DO NOTHING` sea un no-op real ahí y no cree duplicados.
 *
 * Sujeto al mismo guard que los demás seeds de demostración: en producción,
 * SEED_DEMO_DATA=false evita crear estos datos ficticios.
 */
export class SeedClients1700000012000 implements MigrationInterface {
  name = 'SeedClients1700000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (process.env.SEED_DEMO_DATA === 'false') return;

    // ---------------------------------------------------------------
    // CLIENTE 1: Jurídica – Empresa 1
    // AgroSuministros Colombia S.A.S. (NIT 900123456)
    // ---------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO clients (
        id, company_id, full_name, document_number, document_type, dv, person_type,
        legal_name, commercial_name,
        rep_first_name, rep_second_name, rep_first_last_name, rep_second_last_name,
        economic_activity_code, economic_activity_description,
        billing_email, treasury_email,
        establishment_vocation, establishment_size, service_type,
        phone, email, status,
        public_office, foreign_accounts, public_resource_management, foreign_trade,
        jur_public_office, jur_public_resource_management, jur_foreign_trade
      ) VALUES (
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa01',
        '11111111-1111-1111-8111-111111111111',
        'AGROSUMINISTROS COLOMBIA S.A.S.',
        '900123456',
        'nit', '7', 'juridica',
        'AGROSUMINISTROS COLOMBIA S.A.S.',
        'AgroSuministros',
        'Pedro', 'Juan', 'Herrera', 'Díaz',
        '0161', 'Actividades de apoyo a la agricultura',
        'facturacion@agrosuministros.com', 'contabilidad@agrosuministros.com',
        'almacen-agricola', '100-200', 'mostrador',
        '3101234567', 'info@agrosuministros.com', 'active',
        false, false, false, false,
        false, false, false
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0001-0000-4000-8000-000000000001',
        '11111111-1111-1111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa01',
        'principal', 'Carrera 7 # 45-20', 'Cundinamarca', 'Bogotá D.C.', '110001', '3101234567',
        'Pedro', 'Juan', 'Herrera', 'Díaz',
        'Bodega principal'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0002-0000-4000-8000-000000000002',
        '11111111-1111-1111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa01',
        'despacho', 'Avenida 68 # 12-34', 'Cundinamarca', 'Bogotá D.C.', '110001', '3101234567',
        'Juan', NULL, 'Pérez', 'Gómez',
        'Punto de despacho sur'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_references (id, company_id, client_id, sequence, entity, address, department, city, phone, credit_limit) VALUES
        ('cccc0001-0000-4000-8000-000000000001', '11111111-1111-1111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa01', 1, 'Banco Agrario', 'Carrera 7 # 30-15', 'Cundinamarca', 'Bogotá D.C.', '6013289000', '50000000'),
        ('cccc0002-0000-4000-8000-000000000002', '11111111-1111-1111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa01', 2, 'Cooperativa Agropecuaria', 'Carrera 10 # 22-40', 'Antioquia', 'Medellín', '6044440000', '30000000')
      ON CONFLICT (id) DO NOTHING;
    `);

    // ---------------------------------------------------------------
    // CLIENTE 2: Jurídica – Empresa 1
    // Ferretería El Constructor Ltda. (NIT 800987654)
    // ---------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO clients (
        id, company_id, full_name, document_number, document_type, dv, person_type,
        legal_name, commercial_name,
        rep_first_name, rep_second_name, rep_first_last_name, rep_second_last_name,
        economic_activity_code, economic_activity_description,
        billing_email, treasury_email,
        establishment_vocation, establishment_size, service_type,
        phone, email, status,
        public_office, foreign_accounts, public_resource_management, foreign_trade,
        jur_public_office, jur_public_resource_management, jur_foreign_trade
      ) VALUES (
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa02',
        '11111111-1111-1111-8111-111111111111',
        'FERRETERÍA EL CONSTRUCTOR LTDA.',
        '800987654',
        'nit', '3', 'juridica',
        'FERRETERÍA EL CONSTRUCTOR LTDA.',
        'El Constructor',
        'Ana', 'María', 'Restrepo', 'Vargas',
        '4752', 'Comercio al por menor de artículos de ferretería',
        'contabilidad@elconstructor.com', 'tesoreria@elconstructor.com',
        'ferreteria', '50-100', 'autoservicio',
        '3159876543', 'info@elconstructor.com', 'active',
        false, false, false, false,
        false, false, false
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0003-0000-4000-8000-000000000003',
        '11111111-1111-1111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa02',
        'principal', 'Carrera 43A # 1-50', 'Antioquia', 'Medellín', '050001', '3159876543',
        'Ana', 'María', 'Restrepo', 'Vargas',
        'Local comercial centro'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0004-0000-4000-8000-000000000004',
        '11111111-1111-1111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa02',
        'despacho', 'Calle 30 # 43-10', 'Antioquia', 'Medellín', '050001', '3159876543',
        'Carlos', NULL, 'Ramírez', NULL,
        'Bodega de despacho'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_references (id, company_id, client_id, sequence, entity, address, department, city, phone, credit_limit) VALUES
        ('cccc0003-0000-4000-8000-000000000003', '11111111-1111-1111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa02', 1, 'Banco Davivienda', 'Carrera 7 # 35-50', 'Cundinamarca', 'Bogotá D.C.', '6017450000', '80000000'),
        ('cccc0004-0000-4000-8000-000000000004', '11111111-1111-1111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa02', 2, 'Distribuciones El Manicomio', 'Carrera 50 # 15-20', 'Antioquia', 'Medellín', '6042340000', '40000000')
      ON CONFLICT (id) DO NOTHING;
    `);

    // ---------------------------------------------------------------
    // CLIENTE 3: Natural – Empresa 1
    // Carlos Andrés Martínez López (CC 1023456789)
    // ---------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO clients (
        id, company_id, full_name, document_number, document_type, person_type,
        first_name, second_name, first_last_name, second_last_name,
        commercial_name,
        economic_activity_code, economic_activity_description,
        billing_email, treasury_email,
        establishment_vocation, establishment_size, service_type,
        phone, email, status,
        public_office, foreign_accounts, public_resource_management, foreign_trade,
        capital_registered, funds_origin
      ) VALUES (
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa03',
        '11111111-1111-1111-8111-111111111111',
        'Carlos Andrés Martínez López',
        '1023456789',
        'cc', 'natural',
        'Carlos', 'Andrés', 'Martínez', 'López',
        'Carlos Martínez',
        '4711', 'Comercio al por menor en establecimientos no especializados',
        'carlos.martinez@email.com', NULL,
        'miscelanea', 'hasta-50', 'mostrador',
        '3201234567', 'carlos.martinez@email.com', 'active',
        false, false, false, false,
        '15000000', 'Ahorros personales'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0005-0000-4000-8000-000000000005',
        '11111111-1111-1111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa03',
        'principal', 'Calle 52 # 31-18', 'Cundinamarca', 'Bogotá D.C.', '110001', '3201234567',
        'Carlos', 'Andrés', 'Martínez', 'López',
        'Tienda barrio Chapinero'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0006-0000-4000-8000-000000000006',
        '11111111-1111-1111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa03',
        'despacho', 'Carrera 15 # 52-10', 'Cundinamarca', 'Bogotá D.C.', '110001', '3201234567',
        'Carlos', 'Andrés', 'Martínez', 'López',
        'Bodega anexa'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_references (id, company_id, client_id, sequence, entity, address, department, city, phone, credit_limit) VALUES
        ('cccc0005-0000-4000-8000-000000000005', '11111111-1111-1111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa03', 1, 'Droguería La Rebaja', 'Carrera 10 # 40-25', 'Cundinamarca', 'Bogotá D.C.', '6013450000', '5000000'),
        ('cccc0006-0000-4000-8000-000000000006', '11111111-1111-1111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa03', 2, 'Almacenes Éxito', 'Carrera 68 # 28-10', 'Cundinamarca', 'Bogotá D.C.', '6017890000', '10000000')
      ON CONFLICT (id) DO NOTHING;
    `);

    // ---------------------------------------------------------------
    // CLIENTE 4: Jurídica – Empresa 2
    // Distribuidora Santa María S.A. (NIT 899876543)
    // ---------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO clients (
        id, company_id, full_name, document_number, document_type, dv, person_type,
        legal_name, commercial_name,
        rep_first_name, rep_second_name, rep_first_last_name, rep_second_last_name,
        economic_activity_code, economic_activity_description,
        billing_email, treasury_email,
        establishment_vocation, establishment_size, service_type,
        phone, email, status,
        public_office, foreign_accounts, public_resource_management, foreign_trade,
        jur_public_office, jur_public_resource_management, jur_foreign_trade
      ) VALUES (
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa04',
        '22222222-2222-2222-8222-222222222222',
        'DISTRIBUIDORA SANTA MARÍA S.A.',
        '899876543',
        'nit', '5', 'juridica',
        'DISTRIBUIDORA SANTA MARÍA S.A.',
        'Santa María',
        'Roberto', 'Carlos', 'Peláez', 'Muñoz',
        '4690', 'Comercio al por mayor no especializado',
        'facturacion@santamaria.com', 'contabilidad@santamaria.com',
        'distribucion-pdv', 'mas-200', 'bodega',
        '3168765432', 'info@santamaria.com', 'active',
        false, false, false, false,
        false, false, false
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0007-0000-4000-8000-000000000007',
        '22222222-2222-2222-8222-222222222222',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa04',
        'principal', 'Avenida 6N # 38-25', 'Valle del Cauca', 'Cali', '760001', '3168765432',
        'Roberto', 'Carlos', 'Peláez', 'Muñoz',
        'Centro de distribución principal'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0008-0000-4000-8000-000000000008',
        '22222222-2222-2222-8222-222222222222',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa04',
        'despacho', 'Carrera 15 # 5-80', 'Valle del Cauca', 'Cali', '760001', '3168765432',
        'Luis', NULL, 'Sánchez', 'Torres',
        'Punto de entrega norte'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_references (id, company_id, client_id, sequence, entity, address, department, city, phone, credit_limit) VALUES
        ('cccc0007-0000-4000-8000-000000000007', '22222222-2222-2222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa04', 1, 'Bancolombia', 'Carrera 48 # 26-50', 'Valle del Cauca', 'Cali', '6023450000', '120000000'),
        ('cccc0008-0000-4000-8000-000000000008', '22222222-2222-2222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa04', 2, 'Cadena de Abastos La 14', 'Carrera 5 # 10-20', 'Valle del Cauca', 'Cali', '6025670000', '60000000')
      ON CONFLICT (id) DO NOTHING;
    `);

    // ---------------------------------------------------------------
    // CLIENTE 5: Natural – Empresa 2
    // María Fernanda Gómez Ruiz (CC 1098765432)
    // ---------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO clients (
        id, company_id, full_name, document_number, document_type, person_type,
        first_name, second_name, first_last_name, second_last_name,
        commercial_name,
        economic_activity_code, economic_activity_description,
        billing_email, treasury_email,
        establishment_vocation, establishment_size, service_type,
        phone, email, status,
        public_office, foreign_accounts, public_resource_management, foreign_trade,
        capital_registered, funds_origin
      ) VALUES (
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa05',
        '22222222-2222-2222-8222-222222222222',
        'María Fernanda Gómez Ruiz',
        '1098765432',
        'cc', 'natural',
        'María', 'Fernanda', 'Gómez', 'Ruiz',
        'María Gómez',
        '4773', 'Comercio al por menor de productos agrícolas',
        'mfgomez@email.com', NULL,
        'almacen-agricola', '50-100', 'mixto',
        '3218765432', 'mfgomez@email.com', 'active',
        false, false, false, false,
        '20000000', 'Herencia familiar y ahorros'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb0009-0000-4000-8000-000000000009',
        '22222222-2222-2222-8222-222222222222',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa05',
        'principal', 'Carrera 27 # 48-15', 'Santander', 'Bucaramanga', '680001', '3218765432',
        'María', 'Fernanda', 'Gómez', 'Ruiz',
        'Tienda productores locales'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_directions (
        id, company_id, client_id, type, address, department, city, postal_code, phone,
        contact_first_name, contact_second_name, contact_first_last_name, contact_second_last_name,
        description
      ) VALUES (
        'bbbb000a-0000-4000-8000-00000000000a',
        '22222222-2222-2222-8222-222222222222',
        'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa05',
        'despacho', 'Calle 55 # 27-30', 'Santander', 'Bucaramanga', '680001', '3218765432',
        'María', 'Fernanda', 'Gómez', 'Ruiz',
        'Depósito agrícola'
      ) ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO client_references (id, company_id, client_id, sequence, entity, address, department, city, phone, credit_limit) VALUES
        ('cccc0009-0000-4000-8000-000000000009', '22222222-2222-2222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa05', 1, 'Coopcentral', 'Carrera 30 # 45-10', 'Santander', 'Bucaramanga', '6076900000', '8000000'),
        ('cccc000a-0000-4000-8000-00000000000a', '22222222-2222-2222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa05', 2, 'Viveros El Jardín', 'Carrera 15 # 55-20', 'Santander', 'Bucaramanga', '6076540000', '4000000')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const clientIds = [
      'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa01',
      'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa02',
      'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa03',
      'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa04',
      'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaa05',
    ];
    // client_directions y client_references caen en cascada (ON DELETE CASCADE)
    // al borrar el cliente; ver 1700000003000-ClientFieldsSchemas.
    await queryRunner.query(
      `DELETE FROM clients WHERE id = ANY($1::uuid[])`,
      [clientIds],
    );
  }
}
