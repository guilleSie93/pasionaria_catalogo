// Tour de bienvenida con Driver.js (licencia MIT).
// Ubicación sugerida: src/composables/useTour.js
//
// El tour tiene dos partes porque pasa por dos páginas:
//   1) Catálogo (Porfolio.vue): bienvenida, buscador, categorías, producto,
//      cantidad, agregar al carrito e ir al carrito.
//   2) Carrito (Carrito.vue): revisar pedido, nombre, teléfono, forma de pago y enviar.

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const CLAVE_TOUR_VISTO = 'tourVisto';
const CLAVE_TOUR_FASE = 'tourFase';

// --- localStorage a prueba de navegadores que lo bloquean ---------------

const leerStorage = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

const guardarStorage = (clave, valor) => {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Si el navegador bloquea localStorage, simplemente no se recuerda.
  }
};

const borrarStorage = (clave) => {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Nada que hacer.
  }
};

const tourYaVisto = () => leerStorage(CLAVE_TOUR_VISTO) === '1';

// Marca el tour como terminado u omitido y limpia la fase pendiente.
const marcarTourVisto = () => {
  guardarStorage(CLAVE_TOUR_VISTO, '1');
  borrarStorage(CLAVE_TOUR_FASE);
};

// --- Utilidades ----------------------------------------------------------

// Un paso sin "element" es un mensaje centrado; con "element", solo se
// muestra si ese elemento existe en la página.
const existeElemento = (paso) =>
  !paso.element || document.querySelector(paso.element) !== null;

// Agrega el botón "Omitir" al pie del mensaje de bienvenida.
const agregarBotonOmitir = (popover, { driver: tour }) => {
  const omitir = document.createElement('button');

  omitir.type = 'button';
  omitir.className = 'tour-omitir';
  omitir.textContent = 'Omitir';
  omitir.addEventListener('click', () => tour.destroy());

  popover.footerButtons.prepend(omitir);
};

const configuracionBase = {
  nextBtnText: 'Siguiente',
  prevBtnText: 'Anterior',
  doneBtnText: 'Listo',
  showProgress: true,
  progressText: '{{current}} de {{total}}',
  disableActiveInteraction: true,
  popoverClass: 'tour-pasionaria'
};

// --- Parte 1: catálogo -----------------------------------------------------

// router: instancia de vue-router (useRouter()).
// agregarEjemplo: función que agrega al carrito el primer producto visible.
// Devuelve la instancia del tour (o null si no corresponde mostrarlo).
export const iniciarTourCatalogo = ({ router, agregarEjemplo }) => {
  if (tourYaVisto()) return null;

  // Sin productos cargados no hay nada que mostrar.
  if (!document.querySelector('.product-porfolio_item')) return null;

  let tour;
  let continuaEnCarrito = false;

  const irAlCarrito = () => {
    continuaEnCarrito = true;
    guardarStorage(CLAVE_TOUR_FASE, 'carrito');
    tour.destroy();
    router.push('/carrito');
  };

  const pasos = [
    {
      popover: {
        title: '¡Bienvenido a Pasionaria!',
        description:
          'Te mostramos en un minuto cómo armar tu pedido y enviarlo por WhatsApp. ¿Seguimos?',
        nextBtnText: 'Seguir',
        onPopoverRender: agregarBotonOmitir
      }
    },
    {
      element: '.product-porfolio_search',
      popover: {
        title: 'Buscá un producto',
        description: 'Escribí el nombre de lo que necesitás y elegilo de la lista.'
      }
    },
    {
      element: '.product-porfolio_filters ul',
      popover: {
        title: 'Filtrá por categoría',
        description:
          'Tocá una categoría para ver solo esos productos. Volvé a tocarla para ver todos.'
      }
    },
    {
      element: '.product-porfolio_item',
      popover: {
        title: 'Elegí un producto',
        description: 'Cada tarjeta muestra la categoría, la presentación y los precios.'
      }
    },
    {
      element: '.product-porfolio_item .v-number-input',
      popover: {
        title: 'Elegí la cantidad',
        description: 'Con + y − indicás los kilos o las unidades que querés.'
      }
    },
    {
      element: '.product-porfolio_item-content_buy',
      popover: {
        title: 'Agregalo al carrito',
        description:
          'Con este botón el producto se suma a tu pedido. Ahora lo hacemos por vos para que veas cómo queda.',
        nextBtnText: 'Agregar',
        onNextClick: () => {
          agregarEjemplo();
          tour.moveNext();
        }
      }
    },
    {
      element: '.navbar-marketcart',
      popover: {
        title: 'Andá al carrito',
        description:
          'Cuando termines de elegir, entrá al carrito para completar tu pedido.',
        nextBtnText: 'Ir al carrito',
        onNextClick: irAlCarrito
      }
    }
  ].filter(existeElemento);

  tour = driver({
    ...configuracionBase,
    steps: pasos,
    // Se ejecuta al terminar o al cerrar el tour. Si seguimos en el carrito,
    // todavía no se da por visto.
    onDestroyed: () => {
      if (!continuaEnCarrito) marcarTourVisto();
    }
  });

  tour.drive();

  return tour;
};

// --- Parte 2: carrito ------------------------------------------------------

// Solo corre si el cliente llegó desde la parte 1 del tour.
export const iniciarTourCarrito = () => {
  if (tourYaVisto() || leerStorage(CLAVE_TOUR_FASE) !== 'carrito') return null;

  const pasos = [
    {
      element: '.checkout-products',
      popover: {
        title: 'Revisá y confirmá tu pedido',
        description:
          'Acá están los productos que agregaste. Cambiá las cantidades con + y −, o sacá alguno con "Eliminar". Si no querés el producto de ejemplo, eliminalo desde acá.'
      }
    },
    {
      element: '.cart-total',
      popover: {
        title: 'Total estimado',
        description: 'Se calcula con los precios del catálogo.'
      }
    },
    {
      element: '#nombre',
      popover: {
        title: 'Tu nombre y apellido',
        description: 'Escribí tu nombre completo para identificar el pedido.'
      }
    },
    {
      element: '#telefono',
      popover: {
        title: 'Tu teléfono',
        description: 'Lo usamos para poder comunicarnos con vos.'
      }
    },
    {
      element: '.payment-options',
      popover: {
        title: 'Forma de pago',
        description: 'Elegí si vas a pagar por Transferencia o en Efectivo.'
      }
    },
    {
      element: '.send-order-button',
      popover: {
        title: 'Enviá tu pedido',
        description:
          'Al tocar este botón se abre WhatsApp con tu pedido ya escrito. Solo te queda enviarlo.',
        doneBtnText: 'Entendido'
      }
    }
  ].filter(existeElemento);

  if (pasos.length === 0) {
    marcarTourVisto();
    return null;
  }

  const tour = driver({
    ...configuracionBase,
    steps: pasos,
    onDestroyed: marcarTourVisto
  });

  tour.drive();

  return tour;
};