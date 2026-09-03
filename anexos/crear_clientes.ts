import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-crear',
  standalone: true,
  template: `
    <div class="s2">
      <div class="appbar">
        <div class="abk" (click)="goBack()">
          <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="abtitle">
          <h2>Creación de clientes</h2>
        </div>
      </div>

      <div class="body">
        <div class="note">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>
          <p>La información debe coincidir con el documento de registro y diligenciarse en MAYÚSCULA, excepto los correos.</p>
        </div>

        <button class="btn btn-primary" style="margin-bottom:16px">Vinculación de cliente</button>

        <div class="sel">
          <select (change)="onTipoChange($event)">
            <option value="">* Seleccione el tipo de persona</option>
            <option value="natural">Natural</option>
            <option value="juridica">Jurídica</option>
          </select>
          <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>

        @if (tipoPersona()) {

          <div class="sec">Datos del documento</div>

          <div class="sel">
            <select>
              <option value="">* Seleccione el tipo de documento</option>
              <option value="nit">NIT</option>
              <option value="cc">Cédula de Ciudadanía</option>
              <option value="ce">Cédula de Extranjería</option>
              <option value="pp">Permiso de Protección</option>
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="field">
            <input class="inp" placeholder="* Número de documento">
            <span class="cap">0/19</span>
          </div>

          <div class="field">
            <input class="inp" placeholder="DV" value="0" readonly>
            <span class="cap">DV autogenerado</span>
          </div>

          @if (tipoPersona() === 'natural') {

            <div class="sec">Datos personales</div>

            <div class="field">
              <input class="inp" placeholder="* Razón comercial">
            </div>

            <div class="row2">
              <div class="field">
                <input class="inp" placeholder="* Primer nombre">
              </div>
              <div class="field">
                <input class="inp" placeholder="Segundo nombre">
              </div>
            </div>

            <div class="row2">
              <div class="field">
                <input class="inp" placeholder="* Primer apellido">
              </div>
              <div class="field">
                <input class="inp" placeholder="Segundo apellido">
              </div>
            </div>
          }

          @if (tipoPersona() === 'juridica') {

            <div class="sec">Datos de la empresa</div>

            <div class="field">
              <input class="inp" placeholder="* Razón social">
            </div>

            <div class="sec">Representación legal</div>

            <div class="row2">
              <div class="field">
                <input class="inp" placeholder="* Primer nombre">
              </div>
              <div class="field">
                <input class="inp" placeholder="Segundo nombre">
              </div>
            </div>

            <div class="row2">
              <div class="field">
                <input class="inp" placeholder="* Primer apellido">
              </div>
              <div class="field">
                <input class="inp" placeholder="Segundo apellido">
              </div>
            </div>
          }

          <div class="sec">Actividad económica</div>

          <div class="sel">
            <select>
              <option value="">* Seleccione código de actividad económica</option>
              <option value="0111">0111 - Cultivo de cereales</option>
              <option value="0113">0113 - Cultivo de hortalizas</option>
              <option value="0121">0121 - Cultivo de frutas tropicales</option>
              <option value="0122">0122 - Cultivo de café</option>
              <option value="0123">0123 - Cultivo de flores</option>
              <option value="0150">0150 - Explotación mixta agrícola</option>
              <option value="0161">0161 - Actividades de apoyo a la agricultura</option>
              <option value="0171">0171 - Caza ordinaria</option>
              <option value="1011">1011 - Procesamiento de carne y pescado</option>
              <option value="1040">1040 - Elaboración de aceites y grasas</option>
              <option value="1051">1051 - Elaboración de productos lácteos</option>
              <option value="1071">1071 - Elaboración de productos de panadería</option>
              <option value="1101">1101 - Elaboración de bebidas alcohólicas</option>
              <option value="1104">1104 - Elaboración de bebidas no alcohólicas</option>
              <option value="2011">2011 - Fabricación de sustancias químicas básicas</option>
              <option value="2022">2022 - Fabricación de pesticidas y agroquímicos</option>
              <option value="4690">4690 - Comercio al por mayor no especializado</option>
              <option value="4711">4711 - Comercio al por menor en establecimientos no especializados</option>
              <option value="4752">4752 - Comercio al por menor de artículos de ferretería</option>
              <option value="4755">4755 - Comercio al por menor de artículos de uso doméstico</option>
              <option value="4773">4773 - Comercio al por menor de productos agrícolas</option>
              <option value="5210">5210 - Almacenamiento y depósito</option>
              <option value="5221">5221 - Actividades de estaciones de transporte</option>
              <option value="7730">7730 - Alquiler de maquinaria y equipo agropecuario</option>
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="sec">Dirección principal (RUT)</div>

          <div class="field">
            <div class="inp-row">
              <input class="inp" placeholder="* Escriba la dirección manualmente">
              <button class="addr-btn" type="button" (click)="openHelper('principal')">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            </div>
            @if (constructedAddresses()['principal']) {
              <div class="addr-result">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="2"/></svg>
                {{ constructedAddresses()['principal'] }}
              </div>
            }
          </div>

          <div class="sel">
            <select>
              <option value="">* Departamento</option>
              @for (d of deptos; track d) {
                <option value="{{d}}">{{d}}</option>
              }
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="sel">
            <select>
              <option value="">* Ciudad</option>
              @for (c of ciudades; track c) {
                <option value="{{c}}">{{c}}</option>
              }
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="sel">
            <select>
              <option value="">* Código postal</option>
              <option value="110001">110001 - Bogotá D.C.</option>
              <option value="050001">050001 - Medellín</option>
              <option value="760001">760001 - Cali</option>
              <option value="080001">080001 - Barranquilla</option>
              <option value="130001">130001 - Cartagena</option>
              <option value="540001">540001 - Cúcuta</option>
              <option value="680001">680001 - Bucaramanga</option>
              <option value="730001">730001 - Ibagué</option>
              <option value="660001">660001 - Pereira</option>
              <option value="470001">470001 - Santa Marta</option>
              <option value="170001">170001 - Manizales</option>
              <option value="520001">520001 - Pasto</option>
              <option value="410001">410001 - Neiva</option>
              <option value="500001">500001 - Villavicencio</option>
              <option value="230001">230001 - Montería</option>
              <option value="630001">630001 - Armenia</option>
              <option value="190001">190001 - Popayán</option>
              <option value="700001">700001 - Sincelejo</option>
              <option value="200001">200001 - Valledupar</option>
              <option value="440001">440001 - Riohacha</option>
              <option value="150001">150001 - Tunja</option>
              <option value="180001">180001 - Florencia</option>
              <option value="270001">270001 - Quibdó</option>
              <option value="860001">860001 - Mocoa</option>
              <option value="950001">950001 - San José del Guaviare</option>
              <option value="910001">910001 - Leticia</option>
              <option value="850001">850001 - Yopal</option>
              <option value="940001">940001 - Inírida</option>
              <option value="970001">970001 - Mitú</option>
              <option value="990001">990001 - Puerto Carreño</option>
              <option value="810001">810001 - Arauca</option>
              <option value="880001">880001 - San Andrés</option>
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="sec">Contacto</div>

          <div class="row2">
            <div class="sel" style="flex: 0 0 100px;">
              <select>
                <option value="">Ind.</option>
                <option value="601">601</option>
                <option value="602">602</option>
                <option value="604">604</option>
                <option value="605">605</option>
                <option value="606">606</option>
                <option value="607">607</option>
                <option value="608">608</option>
                <option value="609">609</option>
              </select>
              <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="field" style="flex: 1;">
              <input class="inp" placeholder="Teléfono fijo (no obligatorio)">
            </div>
          </div>

          <div class="field">
            <input class="inp" placeholder="* Celular">
          </div>

          <div class="sec">Dirección de despacho</div>

          <div class="sec-sub">Nombre del contacto</div>

          <div class="row2">
            <div class="field">
              <input class="inp" placeholder="* Primer nombre">
            </div>
            <div class="field">
              <input class="inp" placeholder="Segundo nombre">
            </div>
          </div>

          <div class="row2">
            <div class="field">
              <input class="inp" placeholder="* Primer apellido">
            </div>
            <div class="field">
              <input class="inp" placeholder="Segundo apellido">
            </div>
          </div>

          <div class="sec-sub">Ubicación</div>

          <div class="field">
            <div class="inp-row">
              <input class="inp" placeholder="* Dirección">
              <button class="addr-btn" type="button" (click)="openHelper('despacho')">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="2"/></svg>
              </button>
            </div>
            @if (constructedAddresses()['despacho']) {
              <div class="addr-result">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="2"/></svg>
                {{ constructedAddresses()['despacho'] }}
              </div>
            }
          </div>

          <div class="field">
            <textarea class="inp ta" placeholder="Descripción de la dirección (ej: Casa de dos pisos, portón rojo)"></textarea>
          </div>

          <div class="sel">
            <select>
              <option value="">* Departamento</option>
              @for (d of deptos; track d) {
                <option value="{{d}}">{{d}}</option>
              }
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="sel">
            <select>
              <option value="">* Ciudad</option>
              @for (c of ciudades; track c) {
                <option value="{{c}}">{{c}}</option>
              }
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="row2">
            <div class="sel" style="flex: 0 0 100px;">
              <select>
                <option value="">Ind.</option>
                <option value="601">601</option>
                <option value="602">602</option>
                <option value="604">604</option>
                <option value="605">605</option>
                <option value="606">606</option>
                <option value="607">607</option>
                <option value="608">608</option>
                <option value="609">609</option>
              </select>
              <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="field" style="flex: 1;">
              <input class="inp" placeholder="Teléfono">
            </div>
          </div>

          <div class="sec">Información comercial</div>

          <div class="sel">
            <select>
              <option value="">* Vocación del establecimiento</option>
              <option value="almacen-agricola">Almacén agrícola</option>
              <option value="almacen-agricola-ferreteria">Almacén agrícola / Ferretería</option>
              <option value="ferroelectrico">Ferroeléctrico</option>
              <option value="ferreteria">Ferretería</option>
              <option value="miscelanea">Miscelánea</option>
              <option value="viveros">Viveros</option>
              <option value="distribucion-pdv">Distribución punto de venta</option>
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="sel">
            <select>
              <option value="">* Tamaño del establecimiento</option>
              <option value="hasta-50">Hasta 50 m²</option>
              <option value="50-100">50 – 100 m²</option>
              <option value="100-200">100 – 200 m²</option>
              <option value="mas-200">Más de 200 m²</option>
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="sel">
            <select>
              <option value="">* Tipo de atención</option>
              <option value="mostrador">Mostrador</option>
              <option value="autoservicio">Autoservicio</option>
              <option value="mixto">Mixto</option>
              <option value="bodega">Bodega</option>
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="field">
            <input class="inp" type="email" placeholder="* Email facturación electrónica">
          </div>

          <div class="field">
            <input class="inp" type="email" placeholder="Email tesorería y contabilidad">
          </div>

          @if (tipoPersona() === 'natural') {

            <div class="sec">Declaración de origen de fondos</div>

            <div class="sec-sub">¿Desempeña o ha desempeñado cargo público?</div>

            <div class="radio-group">
              <label class="radio">
                <input type="radio" name="cargoPublico" value="si" (change)="cargoPublico.set('si')">
                <span>Sí</span>
              </label>
              <label class="radio">
                <input type="radio" name="cargoPublico" value="no" (change)="cargoPublico.set('no')">
                <span>No</span>
              </label>
            </div>

            @if (cargoPublico() === 'si') {
              <div class="sec-sub">Adjuntar declaración de renta</div>
              <div class="field">
                <div class="file-wrap">
                  <input type="file" id="file-renta" accept=".pdf,.jpg,.png">
                  <label for="file-renta" class="file-label">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
                    Seleccionar archivo
                  </label>
                </div>
              </div>

              <div class="field">
                <input class="inp" placeholder="* Cargo o desempeño">
              </div>

              <div class="row2">
                <div class="field">
                  <label class="f-label">Fecha inicio</label>
                  <input class="inp" type="date">
                </div>
                <div class="field">
                  <label class="f-label">Fecha fin</label>
                  <input class="inp" type="date">
                </div>
              </div>
            }

            <div class="sec-sub">¿Relacione si tiene cuentas en el extranjero?</div>

            <div class="radio-group">
              <label class="radio">
                <input type="radio" name="cuentasExt" value="si">
                <span>Sí</span>
              </label>
              <label class="radio">
                <input type="radio" name="cuentasExt" value="no">
                <span>No</span>
              </label>
            </div>

            <div class="sec-sub">Su cargo implica el manejo de recursos, bienes o valores públicos <span class="opcional">(no obligatorio)</span></div>

            <div class="radio-group">
              <label class="radio">
                <input type="radio" name="manejoPublico" value="si">
                <span>Sí</span>
              </label>
              <label class="radio">
                <input type="radio" name="manejoPublico" value="no">
                <span>No</span>
              </label>
            </div>

            <div class="sec">Comercio exterior</div>

            <div class="sec-sub">¿Tramita operaciones de comercio exterior (importa y exporta)?</div>

            <div class="radio-group">
              <label class="radio">
                <input type="radio" name="comercioExt" value="si" (change)="comercioExterior.set('si')">
                <span>Sí</span>
              </label>
              <label class="radio">
                <input type="radio" name="comercioExt" value="no" (change)="comercioExterior.set('no')">
                <span>No</span>
              </label>
            </div>

            @if (comercioExterior() === 'si') {
              <div class="field">
                <input class="inp" type="number" placeholder="* Número de operaciones al año">
              </div>

              <div class="sec-sub">Forma de pago</div>

              <div class="sel">
                <select (change)="onFormaPagoChange($event)">
                  <option value="">* Seleccione forma de pago</option>
                  <option value="transferencias">Transferencias</option>
                  <option value="tc">Tarjeta de crédito</option>
                  <option value="td">Tarjeta débito</option>
                  <option value="otro">Otro</option>
                </select>
                <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>

              @if (formaPago() === 'otro') {
                <div class="field">
                  <input class="inp" placeholder="Especifique la forma de pago">
                </div>
              }

              <div class="field">
                <textarea class="inp ta" placeholder="* Descripción de la mercancía objeto de trámite"></textarea>
              </div>
            }

            <div class="sec">Capital y fondos</div>

            <div class="field">
              <input class="inp" placeholder="Capital socio registrado">
            </div>

            <div class="field">
              <input class="inp" placeholder="Orígenes de fondos">
            </div>
          }

          @if (tipoPersona() === 'juridica') {

            <div class="sec">Declaraciones</div>

            <div class="sec-sub">¿Desempeña o ha desempeñado cargo público?</div>

            <div class="radio-group">
              <label class="radio">
                <input type="radio" name="jurCargoPublico" value="si">
                <span>Sí</span>
              </label>
              <label class="radio">
                <input type="radio" name="jurCargoPublico" value="no">
                <span>No</span>
              </label>
            </div>

            <div class="sec-sub">Su cargo implica el manejo de recursos, bienes o valores públicos <span class="opcional">(no obligatorio)</span></div>

            <div class="radio-group">
              <label class="radio">
                <input type="radio" name="jurManejoPublico" value="si">
                <span>Sí</span>
              </label>
              <label class="radio">
                <input type="radio" name="jurManejoPublico" value="no">
                <span>No</span>
              </label>
            </div>

            <div class="sec-sub">¿Tramita operaciones de comercio exterior (importa y exporta)?</div>

            <div class="radio-group">
              <label class="radio">
                <input type="radio" name="jurComercioExt" value="si">
                <span>Sí</span>
              </label>
              <label class="radio">
                <input type="radio" name="jurComercioExt" value="no">
                <span>No</span>
              </label>
            </div>
          }

          <div class="sec">Referencias comerciales</div>

          @for (ri of [1, 2, 3]; track ri) {

            <div class="sec-sub">Referencia {{ ri }}</div>

            <div class="field">
              <input class="inp" placeholder="* Entidad">
            </div>

            <div class="field">
              <div class="inp-row">
                <input class="inp" placeholder="* Dirección">
                <button class="addr-btn" type="button" (click)="openHelper('ref' + ri)">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="2"/></svg>
                </button>
              </div>
              @if (constructedAddresses()['ref' + ri]) {
                <div class="addr-result">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="2"/></svg>
                  {{ constructedAddresses()['ref' + ri] }}
                </div>
              }
            </div>

            <div class="sel">
              <select>
                <option value="">* Departamento</option>
                @for (d of deptos; track d) {
                  <option value="{{d}}">{{d}}</option>
                }
              </select>
              <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>

            <div class="sel">
              <select>
                <option value="">* Ciudad</option>
                @for (c of ciudades; track c) {
                  <option value="{{c}}">{{c}}</option>
                }
              </select>
              <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>

            <div class="row2">
              <div class="sel" style="flex: 0 0 100px;">
                <select>
                  <option value="">Ind.</option>
                  <option value="601">601</option>
                  <option value="602">602</option>
                  <option value="604">604</option>
                  <option value="605">605</option>
                  <option value="606">606</option>
                  <option value="607">607</option>
                  <option value="608">608</option>
                  <option value="609">609</option>
                </select>
                <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div class="field" style="flex: 1;">
                <input class="inp" placeholder="Teléfono">
              </div>
            </div>

            <div class="field">
              <input class="inp" placeholder="Cupo crédito">
            </div>
          }

          <div class="sec">Aceptación</div>

          <label class="check-row">
            <input type="checkbox">
            <span>Acepta el tratamiento de datos personales de acuerdo con la política de protección de datos de  S.A.S.</span>
          </label>

          <div class="rowbtn">
            <button class="btn btn-ghost" (click)="goBack()">Cancelar</button>
            <button class="btn btn-primary">Aceptar</button>
          </div>
        }
      </div>

      <button class="fab">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
    </div>

    @if (addressHelperOpen()) {
      <div class="modal-overlay" (click)="closeHelper()">
        <div class="modal" (click)="$event.stopPropagation();">
          <h3>Construir dirección</h3>
          <p class="modal-lead">Complete los campos de nomenclatura para construir la dirección.</p>

          <div class="sel">
            <select (change)="addrTipoVia.set($any($event.target).value); refreshPreview()">
              <option value="">* Tipo de vía</option>
              <option value="Calle">Calle</option>
              <option value="Carrera">Carrera</option>
              <option value="Diagonal">Diagonal</option>
              <option value="Transversal">Transversal</option>
              <option value="Avenida">Avenida</option>
              <option value="Vía">Vía</option>
              <option value="Autopista">Autopista</option>
              <option value="Circunvalar">Circunvalar</option>
              <option value="Pasaje">Pasaje</option>
            </select>
            <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>

          <div class="row3">
            <div class="field">
              <label class="f-label">N°</label>
              <input class="inp" (input)="addrNumero.set($any($event.target).value); refreshPreview()" placeholder="45">
            </div>
            <div class="field">
              <label class="f-label">Letra</label>
              <input class="inp" (input)="addrLetra.set($any($event.target).value); refreshPreview()" placeholder="A">
            </div>
            <div class="sel" style="margin-bottom:0">
              <select (change)="addrBis.set($any($event.target).value); refreshPreview()">
                <option value="">—</option>
                <option value="Bis">Bis</option>
              </select>
              <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>

          <div class="row2">
            <div class="field">
              <label class="f-label"># Secundario</label>
              <input class="inp" (input)="addrNumero2.set($any($event.target).value); refreshPreview()" placeholder="20">
            </div>
            <div class="field">
              <label class="f-label">Letra</label>
              <input class="inp" (input)="addrLetra2.set($any($event.target).value); refreshPreview()" placeholder="B">
            </div>
          </div>

          <div class="row2">
            <div class="sel" style="margin-bottom:0">
              <select (change)="addrComplemento.set($any($event.target).value); refreshPreview()">
                <option value="">* Complemento</option>
                <option value="Casa">Casa</option>
                <option value="Apartamento">Apartamento</option>
                <option value="Oficina">Oficina</option>
                <option value="Local">Local</option>
                <option value="Lote">Lote</option>
                <option value="Manzana">Manzana</option>
                <option value="Edificio">Edificio</option>
                <option value="Torre">Torre</option>
                <option value="Interior">Interior</option>
                <option value="Etapa">Etapa</option>
                <option value="Conjunto">Conjunto</option>
                <option value="Urbanización">Urbanización</option>
              </select>
              <svg class="cv" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="field">
              <label class="f-label">N° complemento</label>
              <input class="inp" (input)="addrNumeroComp.set($any($event.target).value); refreshPreview()" placeholder="3">
            </div>
          </div>

          <div class="field">
            <label class="f-label">Descripción adicional <span class="opcional">(opcional)</span></label>
            <textarea class="inp ta" (input)="addrDesc.set($any($event.target).value); refreshPreview()" placeholder="Ej: Conjunto residencial, portón verde"></textarea>
          </div>

          <div class="addr-preview-box">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="2"/></svg>
            <div>
              <div class="preview-label">Vista previa:</div>
              <strong>{{ addressPreview() || 'Complete los campos para ver la dirección' }}</strong>
            </div>
          </div>

          <div class="rowbtn">
            <button class="btn btn-ghost" (click)="closeHelper()">Cancelar</button>
            <button class="btn btn-primary" (click)="applyAddress()">Aplicar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .s2 { display: flex; flex-direction: column; min-height: 100vh; position: relative; }

    .appbar {
      flex: none;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 14px 12px;
      background: var(--white);
      border-bottom: 1px solid var(--line);
    }
    .abk {
      width: 34px; height: 34px;
      border-radius: 11px;
      border: 1.4px solid var(--line);
      background: var(--white);
      display: grid; place-items: center;
      cursor: pointer; flex: none;
    }
    .abk:hover { background: var(--bg); }
    .abk svg { width: 17px; height: 17px; color: var(--ink); }
    .abtitle { flex: 1; min-width: 0; }
    .abtitle h2 {
      font-family: var(--display);
      font-weight: 700;
      font-size: 16px;
      color: var(--ink);
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px 90px;
      position: relative;
      background: var(--bg);
    }
    .body::-webkit-scrollbar { width: 0; }

    .note {
      display: flex;
      gap: 10px;
      background: #f0f5fb;
      border: 1px solid #dcebf6;
      border-radius: 13px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .note svg {
      width: 18px; height: 18px;
      color: var(--blue);
      flex: none;
      margin-top: 1px;
    }
    .note p {
      font-size: 11px;
      color: #3a5578;
      line-height: 1.45;
    }

    .btn {
      width: 100%;
      height: 50px;
      border: 0;
      border-radius: 14px;
      font-family: var(--display);
      font-weight: 700;
      font-size: 14.5px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      color: var(--white);
      box-shadow: 0 12px 20px -10px rgba(var(--accent-rgb), .55);
    }
    .btn-ghost {
      background: var(--white);
      border: 1.5px solid var(--line);
      color: var(--muted);
      box-shadow: none;
    }

    .sec {
      font-family: var(--display);
      font-weight: 700;
      font-size: 14px;
      color: var(--accent);
      padding: 14px 0 8px;
      margin-bottom: 10px;
      border-bottom: 2px solid var(--accent-soft);
    }

    .sec-sub {
      font-family: var(--display);
      font-weight: 700;
      font-size: 12px;
      color: var(--ink);
      margin: 10px 0 8px 2px;
    }

    .opcional {
      font-weight: 500;
      font-size: 10px;
      color: var(--faint);
    }

    .sel { position: relative; margin-bottom: 12px; }
    .sel select {
      width: 100%;
      height: 50px;
      border: 1.6px solid var(--accent-soft);
      border-radius: 14px;
      background: var(--white);
      padding: 0 15px;
      font-family: var(--display);
      font-size: 14px;
      font-weight: 700;
      color: var(--accent);
      outline: 0;
      appearance: none;
      cursor: pointer;
    }
    .sel select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px rgba(var(--accent-rgb), .13);
    }
    .sel .cv {
      position: absolute;
      right: 13px;
      top: 50%;
      transform: translateY(-50%);
      width: 15px; height: 15px;
      color: var(--accent);
      pointer-events: none;
    }

    .field { margin-bottom: 12px; position: relative; }
    .field .cap {
      position: absolute;
      right: 12px;
      bottom: -15px;
      font-size: 9px;
      color: var(--faint);
    }

    .f-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      margin: 0 0 5px 4px;
    }

    .inp {
      width: 100%;
      height: 50px;
      border: 1.6px solid var(--line);
      border-radius: 14px;
      background: var(--white);
      padding: 0 15px;
      font-family: var(--body);
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      outline: 0;
      transition: .18s;
    }
    .inp::placeholder { color: var(--faint); font-weight: 500; }
    .inp:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px rgba(var(--accent-rgb), .13);
    }

    .inp.ta {
      display: block;
      height: 72px;
      padding: 12px 15px;
      resize: vertical;
      font-family: var(--body);
      line-height: 1.4;
    }

    .inp[readonly] {
      background: var(--bg);
      color: var(--faint);
    }

    .inp-row {
      display: flex;
      align-items: center;
      background: var(--white);
      border: 1.6px solid var(--line);
      border-radius: 14px;
      height: 50px;
      padding: 0 4px 0 14px;
      transition: .18s;
    }
    .inp-row:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px rgba(var(--accent-rgb), .13);
    }
    .inp-row .inp {
      border: 0;
      box-shadow: none;
      padding: 0 8px 0 0;
      height: 100%;
    }

    .addr-btn {
      flex: none;
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 10px;
      background: var(--accent-soft);
      cursor: pointer;
      display: grid;
      place-items: center;
      color: var(--accent);
      transition: .12s;
      margin-left: auto;
    }
    .addr-btn:hover { background: var(--accent); color: var(--white); }
    .addr-btn svg { width: 17px; height: 17px; }

    .addr-result {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: 6px;
      padding: 6px 10px;
      background: #eef6ee;
      border: 1px solid #d3e8d3;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      color: #2a6b3a;
      line-height: 1.4;
    }
    .addr-result svg {
      width: 14px;
      height: 14px;
      flex: none;
      margin-top: 1px;
      color: var(--green);
    }

    .rowbtn { display: flex; gap: 10px; margin-top: 20px; }
    .rowbtn .btn { margin-bottom: 0; }

    .row2 { display: flex; gap: 10px; }
    .row2 .field, .row2 .sel { flex: 1; }

    .row3 { display: flex; gap: 8px; }
    .row3 .field, .row3 .sel { flex: 1; }

    .radio-group {
      display: flex;
      gap: 12px;
      margin: 4px 0 10px 2px;
    }
    .radio {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: var(--white);
      border: 1.6px solid var(--line);
      border-radius: 12px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      transition: .12s;
    }
    .radio:has(input:checked) {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
    .radio input { display: none; }

    .file-wrap { position: relative; }
    .file-wrap input[type="file"] { display: none; }
    .file-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px;
      background: var(--white);
      border: 1.6px dashed var(--line);
      border-radius: 14px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      color: var(--muted);
      transition: .12s;
    }
    .file-label:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .file-label svg {
      width: 18px;
      height: 18px;
      flex: none;
    }

    .check-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: var(--white);
      border: 1.6px solid var(--line);
      border-radius: 14px;
      cursor: pointer;
      margin-top: 8px;
    }
    .check-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
      margin-top: 2px;
      flex: none;
    }
    .check-row span {
      font-size: 12px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.4;
    }

    .fab {
      position: absolute;
      bottom: 76px;
      right: 16px;
      width: 50px; height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent-deep));
      border: 0;
      display: grid; place-items: center;
      cursor: pointer;
      box-shadow: 0 12px 22px -8px rgba(var(--accent-rgb), .6);
      z-index: 10;
    }
    .fab svg { width: 22px; height: 22px; color: #fff; }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 2000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 20px;
    }
    .modal {
      background: var(--white);
      border-radius: 22px 22px 0 0;
      padding: 20px 18px 24px;
      max-height: 92vh;
      overflow-y: auto;
      width: 100%;
      max-width: 480px;
      animation: modalUp .25s ease-out;
    }
    .modal::-webkit-scrollbar { width: 0; }
    .modal h3 {
      font-family: var(--display);
      font-weight: 700;
      font-size: 18px;
      color: var(--ink);
      margin-bottom: 2px;
    }
    .modal-lead {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 14px;
    }
    .addr-preview-box {
      display: flex;
      gap: 10px;
      padding: 12px 14px;
      background: #f0f5fb;
      border: 1px solid #dcebf6;
      border-radius: 13px;
      margin: 12px 0;
    }
    .addr-preview-box svg {
      width: 18px;
      height: 18px;
      color: var(--blue);
      flex: none;
      margin-top: 1px;
    }
    .preview-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .addr-preview-box strong {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.35;
    }

    @keyframes modalUp {
      from { transform: translateY(40px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
})
export class Crear {
  private readonly router = inject(Router);

  protected readonly deptos = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar',
    'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar',
    'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare',
    'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
    'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
    'Valle del Cauca', 'Vaupés', 'Vichada',
  ];

  protected readonly ciudades = [
    'Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
    'Cúcuta', 'Bucaramanga', 'Ibagué', 'Pereira', 'Santa Marta',
    'Manizales', 'Pasto', 'Neiva', 'Villavicencio', 'Montería',
    'Armenia', 'Popayán', 'Sincelejo', 'Valledupar', 'Riohacha',
    'Tunja', 'Florencia', 'Quibdó', 'Mocoa', 'San José del Guaviare',
    'Leticia', 'Yopal', 'Inírida', 'Mitú', 'Puerto Carreño',
    'Arauca', 'San Andrés',
  ];

  protected tipoPersona = signal('');
  protected cargoPublico = signal('');
  protected comercioExterior = signal('');
  protected formaPago = signal('');

  protected addressHelperOpen = signal(false);
  protected addressTarget = signal('');
  protected addressPreview = signal('');

  protected addrTipoVia = signal('');
  protected addrNumero = signal('');
  protected addrLetra = signal('');
  protected addrBis = signal('');
  protected addrNumero2 = signal('');
  protected addrLetra2 = signal('');
  protected addrComplemento = signal('');
  protected addrNumeroComp = signal('');
  protected addrDesc = signal('');

  protected constructedAddresses = signal<Record<string, string>>({});

  private buildAddressPreview(): string {
    const via = this.addrTipoVia();
    const num = this.addrNumero();
    const letra = this.addrLetra();
    const bis = this.addrBis();
    const num2 = this.addrNumero2();
    const letra2 = this.addrLetra2();
    const comp = this.addrComplemento();
    const numComp = this.addrNumeroComp();
    const desc = this.addrDesc();

    const parts: string[] = [];

    let main = '';
    if (via) main += via;
    if (num) {
      main += main ? ' ' : '';
      main += num;
    }
    if (letra) main += ' ' + letra;
    if (bis) main += ' ' + bis;
    if (num2) {
      main += ' # ' + num2;
      if (letra2) main += ' ' + letra2;
    } else if (letra2) {
      main += ' # ' + letra2;
    }
    if (main) parts.push(main);

    if (comp) {
      parts.push(comp + (numComp ? ' ' + numComp : ''));
    } else if (numComp) {
      parts.push('Nro. ' + numComp);
    }

    if (desc) parts.push(desc);

    return parts.join(', ');
  }

  protected refreshPreview() {
    this.addressPreview.set(this.buildAddressPreview());
  }

  protected onTipoChange(event: Event) {
    this.tipoPersona.set((event.target as HTMLSelectElement).value);
  }

  protected onFormaPagoChange(event: Event) {
    this.formaPago.set((event.target as HTMLSelectElement).value);
  }

  protected openHelper(target: string) {
    this.addressTarget.set(target);
    this.addrTipoVia.set('');
    this.addrNumero.set('');
    this.addrLetra.set('');
    this.addrBis.set('');
    this.addrNumero2.set('');
    this.addrLetra2.set('');
    this.addrComplemento.set('');
    this.addrNumeroComp.set('');
    this.addrDesc.set('');
    this.addressPreview.set('');
    this.addressHelperOpen.set(true);
  }

  protected applyAddress() {
    const preview = this.buildAddressPreview();
    if (preview) {
      this.constructedAddresses.update(a => ({ ...a, [this.addressTarget()]: preview }));
    }
    this.addressHelperOpen.set(false);
  }

  protected closeHelper() {
    this.addressHelperOpen.set(false);
  }

  protected goBack() {
    this.router.navigate(['/']);
  }
}
