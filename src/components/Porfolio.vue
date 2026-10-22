<template>
  <div class="product-porfolio_filters px-5">
    <h3 class="w-100 my-3">Categorías:</h3>
    <div class="product-porfolio_filters-categories">
      <div class="product-porfolio_search">
        <v-autocomplete v-model="busqueda" label="Buscar Producto:" :items="nombresProductos" clearable variant="outlined"/>
      </div>
      <ul>
        <li v-for="categoria in categorias" :key="categoria">
          <v-chip :color="categoriaActiva === categoria ? '#777700' : '#434300'" @click="setFilter(categoria)">
            {{ categoria }}
          </v-chip>
        </li>
      </ul>
    </div>
    <v-chip v-if="categoriaActiva" color="#434300" @click="setFilter('')">
      Ver todos
    </v-chip>
  </div>

  <div class="product-porfolio">
    <div
      v-for="producto in productosFiltrados"
      :key="producto.id"
      class="product-porfolio_item"
    >
      <div class="product-porfolio_item-content">
        <h3>{{ producto.nombre }}</h3>

        <p>Categoría: {{ producto.categoria }}</p>
        <p>Presentación: {{ producto.presentacion }}</p>

        <div class="product-porfolio_item-content-price">
          <!-- Presentación por unidad -->
          <template v-if="normalizar(producto.presentacion) === 'unidad'">
            <div class="product-porfolio_item-content-price-unit">
              <p>
                Precio por unidad:
                {{ formatearPrecio(producto.precios[2]) }}
              </p>
            </div>
            <div class="product-porfolio_item-content_actions">
              <button class="product-porfolio_item-content_buy my-auto" @click="agregarAlCarrito(producto)">
                Agregar al carrito
              </button>
              <v-number-input v-model="producto.cantidad" :min="1" :step="1" :precision="0" control-variant="split" label="Cantidad de Unidades" :hide-input="false" inset variant="filled"  hide-details/>
            </div>     
          </template>

          <!-- Presentación por 5 unidades -->
          <template v-else-if="normalizar(producto.presentacion) === '5 unidades'">
            <div class="product-porfolio_item-content-price-unit">
              <p>
                Precio por unidad:
                {{ formatearPrecio(producto.precios[3]) }}
              </p>
            </div>
            <div class="product-porfolio_item-content_actions">
              <button class="product-porfolio_item-content_buy my-auto" @click="agregarAlCarrito(producto)">
                Agregar al carrito
              </button>
              <v-number-input v-model="producto.cantidad" :min="1" :step="1" :precision="0" control-variant="split" label="Cantidad de Unidades" :hide-input="false" inset variant="filled"  hide-details/>
            </div>  
          </template>

          <!-- Presentación por kilo y medio kilo -->
          <template v-else-if="normalizar(producto.presentacion) === 'kg y 1/2 kg'">
            <div class="product-porfolio_item-content-price-unit">
              <p>
                Precio por medio kilo:
                {{ formatearPrecio(producto.precios[1]) }}
              </p>
            </div>

            <div class="product-porfolio_item-content-price-unit">
              <p>
                Precio por kilo:
                {{ formatearPrecio(producto.precios[0]) }}
              </p>
            </div>
            <div class="product-porfolio_item-content_actions">
                <button class="product-porfolio_item-content_buy my-auto" @click="agregarAlCarrito(producto)">
                  Agregar al carrito
                </button>
              <v-number-input v-model="producto.cantidad" :min="0.5" :step="0.5" :precision="1" control-variant="split" label="Cantidad de kilos" :hide-input="false" inset variant="filled"  hide-details/>
            </div>            
          </template>
        </div>

        <!-- Confirmación al agregar al carrito -->
        <v-alert
          v-if="confirmaciones[producto.id]"
          class="product-porfolio_item-alert"
          v-model="confirmaciones[producto.id]"
          title="¡Agregado!"
          text="El producto se agregó al carrito."
          type="success"
          variant="tonal"
          density="compact"
          closable
        />

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Papa from 'papaparse';
import { iniciarTourCatalogo } from '@/composables/useTour';

const router = useRouter();

// Configuración de Google Sheets.
const SHEET_ID = '1nrigbBPineizC9bzYxhpiCUphGnZTDJbPGz5LP0BxWY';
const SHEET_NAME = 'pasionaria_db';

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

// Productos y carrito.
const productos = ref([]);
const carrito = ref(
  JSON.parse(localStorage.getItem('carrito') || '[]')
);

const busqueda = ref('');
const categoriaActiva = ref('');

// Confirmaciones de "agregado al carrito", una por producto.
const confirmaciones = ref({});
const temporizadoresConfirmacion = {};
const TIEMPO_CONFIRMACION = 3000;

const nombresProductos = computed(() =>
  productos.value.map((producto) => producto.nombre)
);

// Limpia comillas y barras invertidas sobrantes.
const limpiarTexto = (valor) => {
  if (valor == null) return '';

  return String(valor)
    .replace(/\\/g, '')
    .replace(/^"+|"+$/g, '')
    .trim();
};

// Normaliza texto para las comparaciones.
const normalizar = (valor) =>
  limpiarTexto(valor).toLowerCase();

// Comprueba si un producto se vende por kilo.
const esPorKilo = (producto) =>
  normalizar(producto.presentacion) === 'kg y 1/2 kg';

// Comprueba si un producto está en la categoría "fuera de catálogo".
// Ignora mayúsculas y tildes ("Fuera de catálogo" también coincide).
const esFueraDeCatalogo = (producto) =>
  normalizar(producto.categoria)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') === 'fuera de catalogo';

// Categorías dinámicas: salen de los productos cargados desde el Sheet,
// en el orden en que aparecen y sin repetirse. Como los productos
// "fuera de catálogo" ya se descartan al cargar, esa categoría no aparece.
const categorias = computed(() => {
  const unicas = new Map();

  productos.value.forEach((producto) => {
    const clave = normalizar(producto.categoria);

    if (clave && !unicas.has(clave)) {
      unicas.set(clave, producto.categoria);
    }
  });

  return [...unicas.values()];
});

// Formatea los precios en pesos argentinos.
const formatearPrecio = (valor) => {
  const precio = limpiarTexto(valor);

  if (precio === '') {
    return 'Sin precio';
  }

  const numero = Number(precio);

  if (!Number.isFinite(numero)) {
    return 'Sin precio';
  }

  return numero.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  });
};

// Filtra los productos por búsqueda y categoría.
const productosFiltrados = computed(() => {
  return productos.value.filter((producto) => {
    const coincideBusqueda = normalizar(producto.nombre).includes(
      normalizar(busqueda.value || '')
    );

    const coincideCategoria =
      !categoriaActiva.value ||
      normalizar(producto.categoria) === normalizar(categoriaActiva.value);

    return coincideBusqueda && coincideCategoria;
  });
});

// Selecciona o desactiva una categoría.
const setFilter = (categoria) => {
  categoriaActiva.value =
    categoriaActiva.value === categoria ? '' : categoria;
};

// Carga productos desde Google Sheets.
const cargarProductos = async () => {
  try {
    const response = await fetch(SHEET_URL);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.text();

    const resultado = Papa.parse(data, {
      skipEmptyLines: true
    });

    if (resultado.errors.length > 0) {
      console.warn('Advertencias del CSV:', resultado.errors);
    }

    productos.value = resultado.data
      .slice(1)
      .map((columnas) => ({
        id: limpiarTexto(columnas[0]),
        nombre: limpiarTexto(columnas[1]),
        categoria: limpiarTexto(columnas[2]),
        presentacion: limpiarTexto(columnas[4]),
        cantidad: 0.5,
        precios: [
          limpiarTexto(columnas[5]),
          limpiarTexto(columnas[6]),
          limpiarTexto(columnas[7]),
          limpiarTexto(columnas[8])
        ]
      }))
      .filter((producto) => producto.id && !esFueraDeCatalogo(producto));

    console.log('Productos cargados:', productos.value);
  } catch (error) {
    console.error(
      'Error al cargar los productos de Google Sheets:',
      error
    );
  }
};

// Guarda el carrito en localStorage.
const guardarCarritoEnStorage = () => {
  localStorage.setItem('carrito', JSON.stringify(carrito.value));
  
};

// Muestra la confirmación en la card del producto y la oculta sola.
// Si se vuelve a agregar antes de que se cierre, reinicia el tiempo.
const mostrarConfirmacion = (id) => {
  confirmaciones.value[id] = true;

  clearTimeout(temporizadoresConfirmacion[id]);

  temporizadoresConfirmacion[id] = setTimeout(() => {
    confirmaciones.value[id] = false;
  }, TIEMPO_CONFIRMACION);
};

// Agrega un producto al carrito.
// Para productos por kilo, utiliza la cantidad seleccionada.
const agregarAlCarrito = (producto) => {
  const cantidadAgregar = esPorKilo(producto)
    ? Math.max(0.5, Number(producto.cantidad) || 0.5)
    : Math.max(1, Math.floor(Number(producto.cantidad)) || 1);

  const existe = carrito.value.find(
    (item) => item.id === producto.id
  );

  if (existe) {
    existe.cantidad = Number(
      (Number(existe.cantidad) + cantidadAgregar).toFixed(2)
    );
  } else {
    carrito.value.push({
      ...producto,
      precios: [...producto.precios],
      cantidad: cantidadAgregar
    });
  }

  guardarCarritoEnStorage();
  mostrarConfirmacion(producto.id);
};

// Elimina un producto del carrito.
const eliminarDelCarrito = (id) => {
  carrito.value = carrito.value.filter(
    (item) => item.id !== id
  );

  guardarCarritoEnStorage();
};

// Modifica la cantidad en el carrito.
// Para productos por kilo, suma o resta 0.5 kg.
const modificarCantidad = ({ id, cambio }) => {
  const item = carrito.value.find(
    (producto) => producto.id === id
  );

  if (!item) return;

  const incremento = esPorKilo(item) ? 0.5 : 1;

  item.cantidad = Number(
    (Number(item.cantidad) + cambio * incremento).toFixed(2)
  );

  if (item.cantidad <= 0) {
    eliminarDelCarrito(id);
  } else {
    guardarCarritoEnStorage();
  }
};

// Persiste los cambios del carrito.
watch(
  carrito,
  (nuevoCarrito) => {
    localStorage.setItem('carrito', JSON.stringify(nuevoCarrito));
  },
  { deep: true }
);

// Tour de bienvenida: durante el paso "Agregar" suma al carrito
// el primer producto visible, para que el carrito no quede vacío.
let tourActivo = null;

const agregarProductoEjemplo = () => {
  const primerProducto = productosFiltrados.value[0];

  if (primerProducto) {
    agregarAlCarrito(primerProducto);
  }
};

// Carga los productos al montar el componente
// y, si es la primera visita, muestra el tour.
onMounted(async () => {
  await cargarProductos();
  await nextTick();

  tourActivo = iniciarTourCatalogo({
    router,
    agregarEjemplo: agregarProductoEjemplo
  });
});

// Si se sale de la página con el tour abierto, se cierra.
onBeforeUnmount(() => {
  if (tourActivo?.isActive()) {
    tourActivo.destroy();
  }
});
</script>

<style lang="scss" scoped>
.product-porfolio {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  padding: 1rem;

  &_item {
    position: relative;
    padding-inline: 1.5rem;
    padding-block: 1rem;
    box-shadow: 0 0px 8px 2px rgba(0, 0, 0, 0.1);
    border-radius: 5px;
    min-width: 0;

    // Confirmación flotante dentro de la card: no afecta la altura de la fila.
    &-alert {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      right: 0.75rem;
      z-index: 2;
      background-color: #fff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 0.5rem;

      &-price {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        &-unit {
          p {
            margin: 0;
          }
        }
      }

      &_actions {
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-top: auto;
        padding-top: 1rem;
        @media (max-width: 1024px) {
          flex-flow: column-reverse nowrap;
        }
      }

      &_buy {
        border-radius: 5px;
        background-color: #434300;
        color: #fff;
        padding: 0.5rem 1rem;
        cursor: pointer;
      }
    }
  }

  &_filters {
    width: 100%;
    display: flex;
    flex-flow: column nowrap;
    gap: 1rem;
    padding: 1rem;
    &-categories {
      display: flex;
      flex-flow: row nowrap;
      gap: 1rem;
      @media (max-width: 1024px) {
        flex-flow: column nowrap;
      }
      
    }
    .product-porfolio_search {
      width: 100%;
      max-width: 400px;
      margin-inline: auto;
    }

    ul {
      list-style: none;
      display: flex;
      flex-flow: row nowrap;
      gap: 1rem;
      overflow-x: auto;
      padding: 1rem;

      li {
        flex: 0 0 auto;
        height: fit-content;

        label {
          cursor: pointer;
        }
      }
    }
  }
}

.product-carrito {
  grid-column: 1 / -1;
  margin-top: 1rem;
  padding: 1.5rem;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);

  &_item {
    padding: 1rem 0;
    border-bottom: 1px solid #ddd;
  }

  &_actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;

    button {
      border: 1px solid #434300;
      border-radius: 5px;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
    }
  }
}

@media (max-width: 1024px) {
  .product-porfolio {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .product-porfolio {
    grid-template-columns: 1fr;
  }
}
</style>

<!-- Estilos globales (sin scoped): el tour se dibuja fuera del componente
     y se usa tanto en el catálogo como en el carrito. -->
<style lang="scss">
.driver-popover.tour-pasionaria {
  .driver-popover-title {
    color: #292900;
  }

  .driver-popover-footer button {
    background-color: #434300;
    color: #fff;
    text-shadow: none;
    border: 1px solid #434300;
    border-radius: 5px;

    &:hover,
    &:focus {
      background-color: #777700;
      border-color: #777700;
      color: #fff;
    }

    // Botón "Omitir" del mensaje de bienvenida.
    &.tour-omitir {
      background-color: #fff;
      color: #434300;

      &:hover,
      &:focus {
        background-color: #f7f7ef;
        border-color: #434300;
        color: #434300;
      }
    }
  }
}
</style>