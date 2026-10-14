import { BadRequestException } from '@nestjs/common';
import { calcNitDv, isValidFullNit } from '../../commons/utils/nit';

export { calcNitDv } from '../../commons/utils/nit';

/**
 * Valida el documento digitado en el estudio y lo devuelve como se guarda en
 * `credits.nit` (solo dígitos, sin '-'):
 *
 *   Persona jurídica: NIT completo, con DV (9001234567). Debe ser el
 *   `document_number` del cliente tal cual. El guion que espera Saman
 *   (900123456-7) lo agrega SamanClient.buildRequest.
 *   Persona natural: número de identificación (cédula) sin DV ni guion. Debe
 *   ser el `document_number` del cliente.
 *
 * Con cliente elegido (`clientDocument`), comparar con su documento impide
 * radicar un crédito de un cliente con el documento de otro. Sin cliente
 * (documento no registrado) solo se valida el formato y el DV.
 */
export function normalizeNitWithDv(input: string, clientDocument: string | null, personType: string): string {
  const juridica = personType === 'juridica';
  if (!/^\d+$/.test(input)) {
    throw new BadRequestException(
      juridica
        ? "El NIT va completo, con DV y sin '-' ni otros caracteres"
        : "El número de identificación va sin DV, sin '-' ni otros caracteres",
    );
  }
  if (clientDocument !== null) {
    const document = (clientDocument.match(/\d/g) ?? []).join('');
    if (input !== document) {
      throw new BadRequestException(
        `El ${juridica ? 'NIT' : 'número de identificación'} no corresponde al cliente seleccionado`,
      );
    }
  }
  if (juridica && !isValidFullNit(input)) {
    throw new BadRequestException(
      clientDocument !== null
        ? `El NIT del cliente no tiene un DV válido (debería terminar en ${calcNitDv(input.slice(0, -1))}); corrígelo en el registro del cliente`
        : `El dígito de verificación no coincide: con ese número, el NIT debería terminar en ${calcNitDv(input.slice(0, -1))}`,
    );
  }
  return input;
}
