
<template>
  <main class="checkout">
    <header class="checkout-header">
      <h1>Mi carrito</h1>
      <p>Revisá tu pedido y completá tus datos para enviarlo.</p>
    </header>

    <div class="checkout-layout">
      <!-- Lista de productos -->
      <section class="checkout-products">
        <h2>Productos seleccionados</h2>

        <div v-if="carrito.length === 0" class="empty-cart">
          <p>Tu carrito está vacío.</p>
          <p>Agregá productos desde el catálogo para continuar.</p>
        </div>

        <article
          v-for="item in carrito"
          :key="item.id"
          class="cart-item"
        >
          <div class="cart-item-info">
            <h3>{{ item.nombre }}</h3>
            <p class="cart-item-category">
              {{ item.categoria }}
            </p>
            <p class="cart-item-presentation">
              Presentación: {{ item.presentacion }}
            </p>

            <p class="cart-item-price">
              Precio unitario:
              {{ obtenerPrecioUnitario(item) }}
            </p>

            <p class="cart-item-subtotal">
              Subtotal: <strong>{{ obtenerSubtotal(item) }}</strong>
            </p>
          </div>

          <div class="cart-item-controls">
            <div class="quantity-control">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                @click="modificarCantidad(item, -1)"
              >
                −
              </button>

              <span>
                {{ formatearCantidad(item.cantidad) }}
                {{ esPorKilo(item) ? 'kg' : 'u.' }}
              </span>

              <button
                type="button"
                aria-label="Aumentar cantidad"
                @click="modificarCantidad(item, 1)"
              >
                +
              </button>
            </div>

            <button
              type="button"
              class="remove-button"
              @click="eliminarDelCarrito(item.id)"
            >
              Eliminar
            </button>
          </div>
        </article>

        <div v-if="carrito.length > 0" class="cart-total">
          <span>Total estimado</span>
          <strong>{{ totalFormateado }}</strong>
          <small v-if="!totalDisponible">
            Hay productos sin precio suficiente para calcular el total.
          </small>
        </div>
      </section>

      <!-- Datos del cliente y pedido -->
      <section class="checkout-form-section">
        <h2>Datos del cliente</h2>

        <form @submit.prevent="enviarPedido">
          <div class="form-field">
            <label for="nombre">Nombre y apellido *</label>
            <input
              id="nombre"
              v-model.trim="cliente.nombre"
              type="text"
              placeholder="Ingresá tu nombre y apellido"
              autocomplete="name"
              required
            />
          </div>

          <div class="form-field">
            <label for="telefono">Teléfono *</label>
            <input
              id="telefono"
              v-model.trim="cliente.telefono"
              type="tel"
              placeholder="Ej.: 341 555 1234"
              autocomplete="tel"
              required
            />
          </div>

          <div class="form-field">
            <label>Forma de pago *</label>

            <div class="payment-options">
              <v-chip
                :color="cliente.formaPago === 'Transferencia' ? '#434300' : undefined"
                :variant="cliente.formaPago === 'Transferencia' ? 'flat' : 'outlined'"
                @click="cliente.formaPago = 'Transferencia'"
              >
                Transferencia
              </v-chip>

              <v-chip
                :color="cliente.formaPago === 'Efectivo' ? '#434300' : undefined"
                :variant="cliente.formaPago === 'Efectivo' ? 'flat' : 'outlined'"
                @click="cliente.formaPago = 'Efectivo'"
              >
                Efectivo
              </v-chip>
            </div>
          </div>

          <div class="order-preview">
            <h3>Resumen del pedido</h3>

            <p>Productos: {{ cantidadProductos }}</p>
            <p>Forma de pago: {{ cliente.formaPago || 'Sin seleccionar' }}</p>
            <p>Total estimado: {{ totalFormateado }}</p>
          </div>

          <p v-if="errorFormulario" class="form-error">
            {{ errorFormulario }}
          </p>

          <button
            type="submit"
            class="send-order-button"
            :disabled="carrito.length === 0"
          >
            Enviar pedido por WhatsApp
          </button>

          <p class="whatsapp-note">
            Se abrirá WhatsApp con el mensaje preparado para que puedas enviarlo.
          </p>
        </form>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const WHATSAPP_NUMERO = '543416919142';

const carrito = ref(
  JSON.parse(localStorage.getItem('carrito') || '[]')
);

const cliente = ref({
  nombre: '',
  telefono: '',
  formaPago: ''
});

const errorFormulario = ref('');

const limpiarTexto = (valor) => {
  if (valor == null) return '';

  return String(valor)
    .replace(/\\/g, '')
    .replace(/^"+|"+$/g, '')
    .trim();
};

const normalizar = (valor) =>
  limpiarTexto(valor).toLowerCase();

const esPorKilo = (producto) =>
  normalizar(producto.presentacion) === 'kg y 1/2 kg';

const esPorCincoUnidades = (producto) =>
  normalizar(producto.presentacion) === '5 unidades';

const formatearCantidad = (cantidad) =>
  Number(cantidad).toLocaleString('es-AR', {
    maximumFractionDigits: 2
  });

const formatearPrecio = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return 'Sin precio';
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 'Sin precio';
  }

  return numero.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  });
};

// Interpreta los precios recibidos desde Google Sheets.
const obtenerNumeroPrecio = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  const numero = Number(limpiarTexto(valor));

  return Number.isFinite(numero) && numero >= 0
    ? numero
    : null;
};

// Devuelve el precio por kilo o por unidad cuando está disponible.
const obtenerPrecioUnitario = (item) => {
  if (esPorKilo(item)) {
    return formatearPrecio(obtenerNumeroPrecio(item.precios?.[0]));
  }

  const indice = esPorCincoUnidades(item) ? 3 : 2;

  return formatearPrecio(
    obtenerNumeroPrecio(item.precios?.[indice])
  );
};

// Calcula el subtotal usando los precios por kilo y medio kilo,
// o el precio por unidad para los productos vendidos por unidad.
const calcularSubtotal = (item) => {
  const cantidad = Number(item.cantidad);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return null;
  }

  if (esPorKilo(item)) {
    // Las cantidades se manejan en incrementos de 0,5 kg.
    const mediosKilos = Math.round(cantidad * 2);
    const kilosCompletos = Math.floor(mediosKilos / 2);
    const quedaMedioKilo = mediosKilos % 2 === 1;

    const precioKilo = obtenerNumeroPrecio(item.precios?.[0]);
    const precioMedioKilo = obtenerNumeroPrecio(item.precios?.[1]);

    if (kilosCompletos > 0 && precioKilo === null) {
      return null;
    }

    if (quedaMedioKilo && precioMedioKilo === null) {
      return null;
    }

    return (
      kilosCompletos * (precioKilo ?? 0) +
      (quedaMedioKilo ? precioMedioKilo : 0)
    );
  }

  const indice = esPorCincoUnidades(item) ? 3 : 2;
  const precioUnidad = obtenerNumeroPrecio(item.precios?.[indice]);

  if (precioUnidad === null) {
    return null;
  }

  return precioUnidad * cantidad;
};

const obtenerSubtotal = (item) => {
  const subtotal = calcularSubtotal(item);

  return subtotal === null
    ? 'No disponible'
    : formatearPrecio(subtotal);
};

const totalDisponible = computed(() =>
  carrito.value.every((item) => calcularSubtotal(item) !== null)
);

const totalNumerico = computed(() =>
  carrito.value.reduce((total, item) => {
    const subtotal = calcularSubtotal(item);

    return subtotal === null ? total : total + subtotal;
  }, 0)
);

const totalFormateado = computed(() =>
  totalDisponible.value
    ? formatearPrecio(totalNumerico.value)
    : 'No disponible'
);

const cantidadProductos = computed(() =>
  carrito.value.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  )
);

// Persiste los cambios de cantidades y eliminaciones.
watch(
  carrito,
  (nuevoCarrito) => {
    localStorage.setItem('carrito', JSON.stringify(nuevoCarrito));
  },
  { deep: true }
);

// Aumenta o disminuye la cantidad del producto.
const modificarCantidad = (item, cambio) => {
  const incremento = esPorKilo(item) ? 0.5 : 1;

  const nuevaCantidad = Number(
    (Number(item.cantidad) + cambio * incremento).toFixed(2)
  );

  if (nuevaCantidad <= 0) {
    eliminarDelCarrito(item.id);
    return;
  }

  item.cantidad = nuevaCantidad;
};

// Elimina un producto del carrito.
const eliminarDelCarrito = (id) => {
  carrito.value = carrito.value.filter(
    (item) => item.id !== id
  );
};

// Prepara el mensaje con todos los datos y abre WhatsApp.
const enviarPedido = () => {
  errorFormulario.value = '';

  if (carrito.value.length === 0) {
    errorFormulario.value = 'Tu carrito está vacío.';
    return;
  }

  if (!cliente.value.nombre.trim()) {
    errorFormulario.value = 'Ingresá tu nombre y apellido.';
    return;
  }

  if (!cliente.value.telefono.trim()) {
    errorFormulario.value = 'Ingresá tu teléfono.';
    return;
  }

  if (!cliente.value.formaPago) {
    errorFormulario.value = 'Seleccioná una forma de pago.';
    return;
  }

  const lineasProductos = carrito.value.map((item, indice) => {
    const subtotal = calcularSubtotal(item);
    const unidad = esPorKilo(item) ? 'kg' : 'unidad(es)';

    return [
      `${indice + 1}. ${item.nombre}`,
      `   Cantidad: ${formatearCantidad(item.cantidad)} ${unidad}`,
      `   Precio unitario: ${obtenerPrecioUnitario(item)}`,
      `   Subtotal: ${subtotal === null ? 'No disponible' : formatearPrecio(subtotal)}`
    ].join('\n');
  });

  const lineasTotal = totalDisponible.value
    ? [`TOTAL ESTIMADO: ${formatearPrecio(totalNumerico.value)}`]
    : [
        'TOTAL: pendiente de confirmar',
        'Uno o más productos no tienen todos los precios necesarios.'
      ];

  const mensaje = [
    '¡Hola! Quiero realizar el siguiente pedido:',
    '',
    'DATOS DEL CLIENTE',
    `Nombre y apellido: ${cliente.value.nombre.trim()}`,
    `Teléfono: ${cliente.value.telefono.trim()}`,
    `Forma de pago: ${cliente.value.formaPago}`,
    '',
    'DETALLE DEL PEDIDO',
    ...lineasProductos,
    '',
    ...lineasTotal,
    '',
    '¡Gracias!'
  ].join('\n');

  const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, '_blank', 'noopener,noreferrer');
};
</script>

<style lang="scss" scoped>
.checkout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  color: #292900;
}

.checkout-header {
  margin-bottom: 2rem;

  h1 {
    margin-bottom: 0.5rem;
    font-size: 2rem;
  }

  p {
    color: #666;
  }
}

.checkout-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
  align-items: start;
  gap: 2rem;
}

.checkout-products,
.checkout-form-section {
  min-width: 0;
  padding: 1.5rem;
  border: 1px solid #e5e5d5;
  border-radius: 12px;
  background: #fff;

  h2 {
    margin: 0 0 1.5rem;
    font-size: 1.35rem;
  }
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 0;
  border-bottom: 1px solid #eee;
}

.cart-item-info {
  min-width: 0;

  h3 {
    margin: 0 0 0.5rem;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0.3rem 0;
  }
}

.cart-item-category,
.cart-item-presentation {
  color: #666;
  font-size: 0.9rem;
}

.cart-item-price {
  margin-top: 0.75rem !important;
  font-size: 0.9rem;
}

.cart-item-subtotal {
  margin-top: 0.5rem !important;
}

.cart-item-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  white-space: nowrap;

  button {
    width: 32px;
    height: 32px;
    border: 1px solid #434300;
    border-radius: 6px;
    background: #fff;
    color: #434300;
    font-size: 1.2rem;
    cursor: pointer;
  }

  span {
    font-weight: 600;
  }
}

.remove-button {
  border: none;
  background: transparent;
  color: #a42c2c;
  text-decoration: underline;
  cursor: pointer;
}

.cart-total {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1.5rem;
  font-size: 1.1rem;

  strong {
    font-size: 1.6rem;
  }

  small {
    color: #a42c2c;
  }
}

.empty-cart {
  padding: 1.5rem 0;
  color: #666;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;

  label {
    font-weight: 600;
  }

  input {
    width: 100%;
    min-height: 44px;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font: inherit;
  }

  input:focus {
    border-color: #434300;
    outline: 2px solid #43430033;
  }
}

.payment-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.order-preview {
  margin: 1.5rem 0;
  padding: 1rem;
  border-radius: 8px;
  background: #f7f7ef;

  h3 {
    margin: 0 0 0.75rem;
  }

  p {
    margin: 0.4rem 0;
  }
}

.form-error {
  margin-bottom: 1rem;
  color: #a42c2c;
}

.send-order-button {
  width: 100%;
  padding: 0.9rem 1rem;
  border: none;
  border-radius: 7px;
  background: #434300;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.send-order-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.whatsapp-note {
  margin-top: 0.75rem;
  color: #666;
  font-size: 0.85rem;
  text-align: center;
}

@media (max-width: 800px) {
  .checkout-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .checkout {
    padding: 1rem 0.75rem;
  }

  .checkout-products,
  .checkout-form-section {
    padding: 1rem;
  }

  .cart-item {
    flex-direction: column;
  }

  .cart-item-controls {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
