"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SpadeIcon as Spades, Club, TrendingUp, Calculator, Target, Award, RotateCcw, Plus } from 'lucide-react';

// Definición de los palos de las cartas
type Palo = 'Corazones' | 'Diamantes' | 'Picas' | 'Tréboles';

// Definición de los rangos de las cartas (del 2 al As)
type Rango = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

// Interfaz para representar una carta individual
interface Carta {
  palo: Palo;
  rango: Rango;
  simbolo: string; // Símbolo Unicode del palo
  color: 'rojo' | 'negro'; // Color para el estilo
}

// Definición de los tipos de mano de póker y su valor para comparación
enum TipoMano {
  CARTA_ALTA = 1,
  PAREJA = 2,
  DOBLE_PAREJA = 3,
  TRIO = 4,
  ESCALERA = 5,
  COLOR = 6,
  FULL_HOUSE = 7,
  POKER = 8,
  ESCALERA_DE_COLOR = 9,
  ESCALERA_REAL_DE_COLOR = 10,
}

// Interfaz para el resultado de la evaluación de la mano
interface ResultadoMano {
  tipo: TipoMano;
  descripcion: string;
  cartasClave: Carta[]; // Cartas que forman la mano principal (ej: el par, el trío)
  kickers: Carta[]; // Cartas de desempate (las que no forman parte de la mano principal pero son importantes para el desempate)
}

// Mapa para convertir rangos a valores numéricos para facilitar la comparación
const valorRango: Record<Rango, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14, // As puede ser 1 o 14 para escaleras
};

// Función para obtener el valor numérico de una carta
const obtenerValorNumericoCarta = (carta: Carta): number => {
  return valorRango[carta.rango];
};

// Función para ordenar cartas de mayor a menor rango
const ordenarCartas = (cartas: Carta[]): Carta[] => {
  return [...cartas].sort((a, b) => obtenerValorNumericoCarta(b) - obtenerValorNumericoCarta(a));
};

// Función para contar las ocurrencias de cada rango
const contarRangos = (cartas: Carta[]): Map<Rango, number> => {
  const conteo = new Map<Rango, number>();
  for (const carta of cartas) {
    conteo.set(carta.rango, (conteo.get(carta.rango) || 0) + 1);
  }
  return conteo;
};

// Función para contar las ocurrencias de cada palo
const contarPalos = (cartas: Carta[]): Map<Palo, number> => {
  const conteo = new Map<Palo, number>();
  for (const carta of cartas) {
    conteo.set(carta.palo, (conteo.get(carta.palo) || 0) + 1);
  }
  return conteo;
};

// Función para verificar si hay una escalera
const esEscalera = (cartasOrdenadas: Carta[]): boolean => {
  if (cartasOrdenadas.length < 5) return false;
  // Obtener valores numéricos únicos y ordenados
  const valoresUnicos = Array.from(new Set(cartasOrdenadas.map(obtenerValorNumericoCarta))).sort((a, b) => a - b);
  // Verificar escalera normal
  for (let i = 0; i <= valoresUnicos.length - 5; i++) {
    let esSecuencia = true;
    for (let j = 0; j < 4; j++) {
      if (valoresUnicos[i + j] + 1 !== valoresUnicos[i + j + 1]) {
        esSecuencia = false;
        break;
      }
    }
    if (esSecuencia) return true;
  }
  // Verificar escalera A-5 (A, 2, 3, 4, 5)
  const tieneA = valoresUnicos.includes(valorRango['A']);
  const tiene2345 = valoresUnicos.includes(valorRango['2']) &&
                    valoresUnicos.includes(valorRango['3']) &&
                    valoresUnicos.includes(valorRango['4']) &&
                    valoresUnicos.includes(valorRango['5']);
  if (tieneA && tiene2345) return true;
  return false;
};

// Función para verificar si hay un color (Flush)
const esColor = (cartas: Carta[]): Palo | null => {
  const conteo = contarPalos(cartas);
  for (const [palo, cantidad] of conteo.entries()) {
    if (cantidad >= 5) { // Si hay 5 o más cartas del mismo palo
      return palo;
    }
  }
  return null;
};

// Función para evaluar la mejor mano de póker de 5 cartas
// Esta es la función auxiliar que evalúa una combinación específica de 5 cartas.
const evaluarMano5Cartas = (cartas: Carta[]): ResultadoMano => {
  // Asegurarse de que tenemos exactamente 5 cartas para evaluar una mano completa.
  if (cartas.length !== 5) {
    // Esto no debería ocurrir si se llama correctamente desde obtenerMejorMano
    return { tipo: TipoMano.CARTA_ALTA, descripcion: 'Número incorrecto de cartas para evaluar (se esperan 5)', cartasClave: [], kickers: [] };
  }

  const cartasOrdenadas = ordenarCartas(cartas);
  const conteoRangos = contarRangos(cartasOrdenadas);
  const rangosAgrupadosPorCantidad: Map<number, Rango[]> = new Map();

  for (const [rango, cantidad] of conteoRangos.entries()) {
    if (!rangosAgrupadosPorCantidad.has(cantidad)) {
      rangosAgrupadosPorCantidad.set(cantidad, []);
    }
    rangosAgrupadosPorCantidad.get(cantidad)?.push(rango);
  }

  // Ordenar los rangos dentro de cada grupo de cantidad (ej: para doble pareja, la más alta primero)
  for (const cantidad of rangosAgrupadosPorCantidad.keys()) {
    rangosAgrupadosPorCantidad.get(cantidad)?.sort((a, b) => valorRango[b] - valorRango[a]);
  }

  const tieneColor = esColor(cartasOrdenadas);
  const tieneEscalera = esEscalera(cartasOrdenadas);

  // 1. Escalera Real de Color (Royal Flush)
  if (tieneColor && tieneEscalera) {
    const cartasDeColor = cartasOrdenadas.filter(c => c.palo === tieneColor);
    const valoresDeColor = cartasDeColor.map(obtenerValorNumericoCarta);
    const esRoyal = valoresDeColor.includes(valorRango['A']) &&
                    valoresDeColor.includes(valorRango['K']) &&
                    valoresDeColor.includes(valorRango['Q']) &&
                    valoresDeColor.includes(valorRango['J']) &&
                    valoresDeColor.includes(valorRango['10']);
    if (esRoyal) {
      return { tipo: TipoMano.ESCALERA_REAL_DE_COLOR, descripcion: 'Escalera Real de Color', cartasClave: cartasDeColor.slice(0,5), kickers: [] };
    }
  }

  // 2. Escalera de Color (Straight Flush)
  if (tieneColor && tieneEscalera) {
    const cartasDelPalo = cartasOrdenadas.filter(c => c.palo === tieneColor);
    if (cartasDelPalo.length >= 5) {
      const valoresDelPalo = Array.from(new Set(cartasDelPalo.map(obtenerValorNumericoCarta))).sort((a, b) => a - b);
      for (let i = 0; i <= valoresDelPalo.length - 5; i++) {
        let esSecuencia = true;
        for (let j = 0; j < 4; j++) {
          if (valoresDelPalo[i + j] + 1 !== valoresDelPalo[i + j + 1]) {
            esSecuencia = false;
            break;
          }
        }
        if (esSecuencia) {
            const valorInicial = valoresDelPalo[i];
            const cartasEscaleraColor = cartasDelPalo.filter(c => {
                const val = obtenerValorNumericoCarta(c);
                return val >= valorInicial && val < valorInicial + 5;
            }).slice(0,5);
            return { tipo: TipoMano.ESCALERA_DE_COLOR, descripcion: 'Escalera de Color', cartasClave: cartasEscaleraColor, kickers: [] };
        }
      }
      const tieneA = valoresDelPalo.includes(valorRango['A']);
      const tiene2345 = valoresDelPalo.includes(valorRango['2']) &&
                        valoresDelPalo.includes(valorRango['3']) &&
                        valoresDelPalo.includes(valorRango['4']) &&
                        valoresDelPalo.includes(valorRango['5']);
      if (tieneA && tiene2345) {
          const cartasEscaleraColorA5 = cartasDelPalo.filter(c => [valorRango['A'], valorRango['2'], valorRango['3'], valorRango['4'], valorRango['5']].includes(obtenerValorNumericoCarta(c))).slice(0,5);
          return { tipo: TipoMano.ESCALERA_DE_COLOR, descripcion: 'Escalera de Color', cartasClave: cartasEscaleraColorA5, kickers: [] };
      }
    }
  }

  // 3. Póker (Four of a Kind)
  if (rangosAgrupadosPorCantidad.has(4)) {
    const rangoPoker = rangosAgrupadosPorCantidad.get(4)![0];
    const cartasPoker = cartasOrdenadas.filter(c => c.rango === rangoPoker);
    const kickers = cartasOrdenadas.filter(c => c.rango !== rangoPoker).slice(0,1);
    return { tipo: TipoMano.POKER, descripcion: `Póker de ${rangoPoker}`, cartasClave: cartasPoker, kickers: kickers };
  }

  // 4. Full House
  if (rangosAgrupadosPorCantidad.has(3) && rangosAgrupadosPorCantidad.has(2)) {
    const rangoTrio = rangosAgrupadosPorCantidad.get(3)![0];
    const rangoPar = rangosAgrupadosPorCantidad.get(2)![0];
    const cartasTrio = cartasOrdenadas.filter(c => c.rango === rangoTrio);
    const cartasPar = cartasOrdenadas.filter(c => c.rango === rangoPar);
    return { tipo: TipoMano.FULL_HOUSE, descripcion: `Full House de ${rangoTrio} sobre ${rangoPar}`, cartasClave: [...cartasTrio, ...cartasPar], kickers: [] };
  }

  // 5. Color (Flush)
  if (tieneColor) {
    const cartasColor = cartasOrdenadas.filter(c => c.palo === tieneColor).slice(0, 5);
    return { tipo: TipoMano.COLOR, descripcion: `Color de ${tieneColor}`, cartasClave: cartasColor, kickers: [] };
  }

  // 6. Escalera (Straight)
  if (tieneEscalera) {
    const valoresUnicos = Array.from(new Set(cartasOrdenadas.map(obtenerValorNumericoCarta))).sort((a, b) => a - b);
    let cartasEscalera: Carta[] = [];
    for (let i = 0; i <= valoresUnicos.length - 5; i++) {
      let esSecuencia = true;
      for (let j = 0; j < 4; j++) {
        if (valoresUnicos[i + j] + 1 !== valoresUnicos[i + j + 1]) {
          esSecuencia = false;
          break;
        }
      }
      if (esSecuencia) {
        const valorInicial = valoresUnicos[i];
        cartasEscalera = cartasOrdenadas.filter(c => {
            const val = obtenerValorNumericoCarta(c);
            return val >= valorInicial && val < valorInicial + 5;
        }).slice(0,5);
        break;
      }
    }
    if (cartasEscalera.length === 0) {
      const valoresA5 = [valorRango['A'], valorRango['2'], valorRango['3'], valorRango['4'], valorRango['5']];
      const tieneTodasA5 = valoresA5.every(val => valoresUnicos.includes(val));
      if (tieneTodasA5) {
        cartasEscalera = cartasOrdenadas.filter(c => valoresA5.includes(obtenerValorNumericoCarta(c))).slice(0,5);
      }
    }
    return { tipo: TipoMano.ESCALERA, descripcion: 'Escalera', cartasClave: cartasEscalera, kickers: [] };
  }

  // 7. Trío (Three of a Kind)
  if (rangosAgrupadosPorCantidad.has(3)) {
    const rangoTrio = rangosAgrupadosPorCantidad.get(3)![0];
    const cartasTrio = cartasOrdenadas.filter(c => c.rango === rangoTrio);
    const kickers: Carta[] = cartasOrdenadas.filter(c => c.rango !== rangoTrio).slice(0,2);
    return { tipo: TipoMano.TRIO, descripcion: `Trío de ${rangoTrio}`, cartasClave: cartasTrio, kickers: kickers };
  }

  // 8. Doble Pareja (Two Pair)
  if (rangosAgrupadosPorCantidad.has(2) && rangosAgrupadosPorCantidad.get(2)!.length >= 2) {
    const rangosPares = rangosAgrupadosPorCantidad.get(2)!; // Ya están ordenados de mayor a menor
    const rangoPar1 = rangosPares[0];
    const rangoPar2 = rangosPares[1];
    const cartasPar1 = cartasOrdenadas.filter(c => c.rango === rangoPar1);
    const cartasPar2 = cartasOrdenadas.filter(c => c.rango === rangoPar2);
    const kickers = cartasOrdenadas.filter(c => c.rango !== rangoPar1 && c.rango !== rangoPar2).slice(0,1);
    return { tipo: TipoMano.DOBLE_PAREJA, descripcion: `Doble Pareja de ${rangoPar1} y ${rangoPar2}`, cartasClave: [...cartasPar1, ...cartasPar2], kickers: [] };
  }

  // 9. Pareja (One Pair)
  if (rangosAgrupadosPorCantidad.has(2)) {
    const rangoPar = rangosAgrupadosPorCantidad.get(2)![0];
    const cartasPar = cartasOrdenadas.filter(c => c.rango === rangoPar);
    const kickers = cartasOrdenadas.filter(c => c.rango !== rangoPar).slice(0,3);
    return { tipo: TipoMano.PAREJA, descripcion: `Pareja de ${rangoPar}`, cartasClave: cartasPar, kickers: kickers };
  }

  // 10. Carta Alta (High Card)
  return { tipo: TipoMano.CARTA_ALTA, descripcion: `Carta Alta: ${cartasOrdenadas[0].rango}`, cartasClave: [cartasOrdenadas[0]], kickers: cartasOrdenadas.slice(1,5) };
};

// Función para generar todas las combinaciones de k elementos de un array
function generarCombinaciones<T>(arr: T[], k: number): T[][] {
  const resultado: T[][] = [];
  function backtrack(combinacionActual: T[], inicio: number) {
    if (combinacionActual.length === k) {
      resultado.push([...combinacionActual]);
      return;
    }
    for (let i = inicio; i < arr.length; i++) {
      combinacionActual.push(arr[i]);
      backtrack(combinacionActual, i + 1);
      combinacionActual.pop();
    }
  }
  backtrack([], 0);
  return resultado;
}

// Función para comparar dos manos de póker y determinar cuál es mejor
// Retorna 1 si mano1 es mejor, -1 si mano2 es mejor, 0 si hay empate
const compararManos = (mano1: ResultadoMano, mano2: ResultadoMano): number => {
  // Primero, comparar por el tipo de mano (ej. Póker > Full House)
  if (mano1.tipo !== mano2.tipo) {
    return mano1.tipo > mano2.tipo ? 1 : -1;
  }

  // Si los tipos son iguales, comparar las cartas clave y luego los kickers
  // Convertir a valores numéricos para una comparación más fácil
  const valoresClave1 = mano1.cartasClave.map(obtenerValorNumericoCarta);
  const valoresClave2 = mano2.cartasClave.map(obtenerValorNumericoCarta);

  // Ordenar de mayor a menor para comparar las cartas más altas primero
  valoresClave1.sort((a, b) => b - a);
  valoresClave2.sort((a, b) => b - a); 

  for (let i = 0; i < valoresClave1.length; i++) {
    if (valoresClave1[i] !== valoresClave2[i]) {
      return valoresClave1[i] > valoresClave2[i] ? 1 : -1;
    }
    // Manejar el caso de As-5 escalera donde el As es 1 para la comparación
    if (valoresClave1[i] === valorRango['A'] && valoresClave2[i] === valorRango['A'] &&
        (mano1.descripcion.includes('Escalera') && mano1.cartasClave.some(c => c.rango === '5')) &&
        (mano2.descripcion.includes('Escalera') && mano2.cartasClave.some(c => c.rango === '5'))) {
        // Ambos tienen escalera A-5, se consideran iguales en el As
        continue;
    }
  }

  // Si las cartas clave son iguales, comparar los kickers
  const valoresKickers1 = mano1.kickers.map(obtenerValorNumericoCarta);
  const valoresKickers2 = mano2.kickers.map(obtenerValorNumericoCarta);
  valoresKickers1.sort((a, b) => b - a);
  valoresKickers2.sort((a, b) => b - a);

  for (let i = 0; i < valoresKickers1.length; i++) {
    if (valoresKickers1[i] !== valoresKickers2[i]) {
      return valoresKickers1[i] > valoresKickers2[i] ? 1 : -1;
    }
  }

  // Si todo es igual, es un empate
  return 0;
};

// Función principal para obtener la mejor mano de póker a partir de un conjunto de cartas (hasta 7)
const obtenerMejorMano = (cartasDisponibles: Carta[]): ResultadoMano => {
  if (cartasDisponibles.length < 5) {
    return { tipo: TipoMano.CARTA_ALTA, descripcion: 'No hay suficientes cartas para formar una mano (mínimo 5)', cartasClave: [], kickers: [] };
  }

  // Generar todas las combinaciones de 5 cartas
  const combinacionesDe5 = generarCombinaciones(cartasDisponibles, 5);
  let mejorMano: ResultadoMano = {
    tipo: TipoMano.CARTA_ALTA,
    descripcion: 'Sin mano definida',
    cartasClave: [],
    kickers: []
  };

  // Evaluar cada combinación y encontrar la mejor
  for (const combinacion of combinacionesDe5) {
    const manoActual = evaluarMano5Cartas(combinacion);
    if (mejorMano.cartasClave.length === 0 || compararManos(manoActual, mejorMano) > 0) {
      mejorMano = manoActual;
    }
  }

  return mejorMano;
};

// Función para crear un mazo estándar de 52 cartas
const crearMazo = (): Carta[] => {
  const palos: Palo[] = ['Corazones', 'Diamantes', 'Picas', 'Tréboles'];
  const rangos: Rango[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const mazo: Carta[] = [];

  for (const palo of palos) {
    let simbolo: string;
    let color: 'rojo' | 'negro';
    switch (palo) {
      case 'Corazones':
        simbolo = '♥';
        color = 'rojo';
        break;
      case 'Diamantes':
        simbolo = '♦';
        color = 'rojo';
        break;
      case 'Picas':
        simbolo = '♠';
        color = 'negro';
        break;
      case 'Tréboles':
        simbolo = '♣';
        color = 'negro';
        break;
    }

    for (const rango of rangos) {
      mazo.push({ palo, rango, simbolo, color });
    }
  }

  return mazo;
};

// Función para verificar si dos cartas son iguales (mismo rango y palo)
const sonCartasIguales = (c1: Carta, c2: Carta): boolean => {
  return c1.rango === c2.rango && c1.palo === c2.palo;
};

// Función para calcular los outs y las probabilidades (se mantiene para referencia, pero la Equity es más completa)
const calcularOutsYProbabilidades = (
  cartasEnManoJugador: Carta[],
  cartasComunitarias: Carta[],
  mazoCompleto: Carta[]) => {
  const cartasVistas = [...cartasEnManoJugador, ...cartasComunitarias];
  // Filtrar el mazo completo para obtener las cartas restantes (no vistas)
  const mazoRestante = mazoCompleto.filter(cartaMazo =>
    !cartasVistas.some(cartaVista => sonCartasIguales(cartaMazo, cartaVista))
  );

  const cartasActualesParaMano = [...cartasEnManoJugador, ...cartasComunitarias];
  const mejorManoActual = obtenerMejorMano(cartasActualesParaMano);

  let outs = 0;
  const cartasQueDanOuts: Carta[] = [];

  for (const cartaPotencial of mazoRestante) {
    const cartasParaManoFutura = [...cartasActualesParaMano, cartaPotencial];
    const mejorManoFutura = obtenerMejorMano(cartasParaManoFutura);
    // Si la mano futura es mejor que la mano actual, es un out
    if (compararManos(mejorManoFutura, mejorManoActual) > 0) {
      outs++;
      cartasQueDanOuts.push(cartaPotencial);
    }
  }

  const cartasRestantesEnMazo = mazoRestante.length;
  let probabilidadSiguienteCarta = 0; // Probabilidad de obtener un out en la siguiente carta (Turn o River)
  let probabilidadTurnRiver = 0; // Probabilidad de obtener un out en la siguiente carta o en las dos siguientes

  if (cartasRestantesEnMazo > 0) {
    probabilidadSiguienteCarta = (outs / cartasRestantesEnMazo) * 100;
    // Si estamos en el Flop (3 cartas comunitarias), quedan 2 cartas por venir (Turn y River)
    if (cartasComunitarias.length === 3) {
      // Regla del 4 para Flop a River
      probabilidadTurnRiver = outs * 4;
    }
    // Si estamos en el Turn (4 cartas comunitarias), queda 1 carta por venir (River)
    else if (cartasComunitarias.length === 4) {
      // Regla del 2 para Turn a River
      probabilidadTurnRiver = outs * 2;
    }
  }

  return {
    outs,
    probabilidadSiguienteCarta: probabilidadSiguienteCarta.toFixed(2), // Redondear a 2 decimales
    probabilidadTurnRiver: probabilidadTurnRiver.toFixed(2), // Redondear a 2 decimales
    cartasQueDanOuts,
  };
};

// Función para calcular las Pot Odds
const calcularPotOdds = (boteActual: number, apuestaAEnfrentar: number): string => {
  if (apuestaAEnfrentar <= 0) {
    return 'N/A (No hay apuesta que enfrentar)';
  }
  const totalEnBote = boteActual + apuestaAEnfrentar;
  const potOddsDecimal = apuestaAEnfrentar / totalEnBote;
  const potOddsPorcentaje = potOddsDecimal * 100;
  return potOddsPorcentaje.toFixed(2); // Redondear a 2 decimales
};

// Función para calcular la Equity de la mano del jugador contra una mano aleatoria del oponente
const calcularEquity = (
  cartasJugador: Carta[],
  cartasComunitarias: Carta[],
  mazoCompleto: Carta[],
  numSimulaciones: number = 5000 // Número de simulaciones para la precisión
): string => {
  if (cartasJugador.length !== 2) return 'N/A'; // Necesitas 2 cartas de mano
  if (cartasComunitarias.length === 0) return 'N/A'; // Necesitas al menos el flop

  let victorias = 0;
  let empates = 0;
  let totalSimulacionesValidas = 0; // Contador para simulaciones que se ejecutan completamente

  const cartasVistas = [...cartasJugador, ...cartasComunitarias];
  const mazoRestanteBase = mazoCompleto.filter(cartaMazo =>
    !cartasVistas.some(cartaVista => sonCartasIguales(cartaMazo, cartaVista))
  );

  for (let i = 0; i < numSimulaciones; i++) {
    const mazoSimulacion = [...mazoRestanteBase].sort(() => Math.random() - 0.5);
    const cartasNecesariasParaSimulacion = 2 + (5 - cartasComunitarias.length); // 2 para oponente + restantes para comunidad

    // Asegurarse de que hay suficientes cartas en el mazo para la simulación
    if (mazoSimulacion.length < cartasNecesariasParaSimulacion) {
        continue; // Saltar esta simulación si no hay suficientes cartas
    }

    // Repartir 2 cartas para el oponente
    const manoOponente: Carta[] = [];
    // Asegura que hay al menos 2 cartas para el oponente y que no se intente pop de un array vacío
    if (mazoSimulacion.length >= 2) { 
      manoOponente.push(mazoSimulacion.pop()!);
      manoOponente.push(mazoSimulacion.pop()!);
    } else {
        continue; // Saltar si no se pueden repartir las cartas del oponente
    }

    // Repartir las cartas comunitarias restantes (Turn y River)
    const cartasComunitariasFuturas: Carta[] = [];
    const cartasNecesariasParaBoard = 5 - cartasComunitarias.length;
    for (let j = 0; j < cartasNecesariasParaBoard; j++) {
      if (mazoSimulacion.length > 0) { // Asegura que hay cartas para el board
        cartasComunitariasFuturas.push(mazoSimulacion.pop()!);
      } else {
          continue; // Saltar si no se pueden completar las cartas del board
      }
    }

    // Si no se pudieron repartir todas las cartas necesarias, saltar esta simulación
    if (manoOponente.length !== 2 || cartasComunitariasFuturas.length !== cartasNecesariasParaBoard) {
        continue;
    }

    const cartasFinalesJugador = [...cartasJugador, ...cartasComunitarias, ...cartasComunitariasFuturas];
    const cartasFinalesOponente = [...manoOponente, ...cartasComunitarias, ...cartasComunitariasFuturas];

    // Asegurarse de que las manos finales tienen 7 cartas para una evaluación completa
    if (cartasFinalesJugador.length !== 7 || cartasFinalesOponente.length !== 7) {
        continue;
    }

    const mejorManoJugador = obtenerMejorMano(cartasFinalesJugador);
    const mejorManoOponente = obtenerMejorMano(cartasFinalesOponente);

    // Asegurarse de que las evaluaciones de mano son válidas
    if (!mejorManoJugador || !mejorManoOponente) {
        continue;
    }

    totalSimulacionesValidas++; // Solo contamos las simulaciones que llegaron hasta aquí

    const resultadoComparacion = compararManos(mejorManoJugador, mejorManoOponente);
    if (resultadoComparacion > 0) {
      victorias++;
    } else if (resultadoComparacion === 0) {
      empates++;
    }
  }

  if (totalSimulacionesValidas === 0) {
      return '0.00'; // Evitar división por cero si no hubo simulaciones válidas
  }

  const equityCalculada = ((victorias + empates / 2) / totalSimulacionesValidas) * 100;
  return equityCalculada.toFixed(2);
};


// Función para evaluar la fuerza de la mano inicial (pre-flop)
const evaluarManoInicialPreFlop = (cartas: Carta[]): 'muyFuerte' | 'fuerte' | 'media' | 'debil' | 'muyDebil' => {
  if (cartas.length !== 2) return 'debil'; // Debe haber exactamente 2 cartas de mano

  const [c1, c2] = ordenarCartas(cartas); // c1 es la carta de mayor rango
  const val1 = obtenerValorNumericoCarta(c1);
  const val2 = obtenerValorNumericoCarta(c2);
  const suited = c1.palo === c2.palo;
  const isPair = c1.rango === c2.rango;

  // 1. Manos explícitamente muy débiles (Fold casi siempre si hay apuesta)
  if (!suited) { // Todas las manos listadas son offsuit
    // 2-7o, 2-8o, 3-7o, 3-8o, 2-10o, 9-5o
    if ((val1 === valorRango['7'] && val2 === valorRango['2']) ||
        (val1 === valorRango['8'] && val2 === valorRango['2']) ||
        (val1 === valorRango['8'] && val2 === valorRango['3']) ||
        (val1 === valorRango['7'] && val2 === valorRango['3']) ||
        (val1 === valorRango['10'] && val2 === valorRango['2']) ||
        (val1 === valorRango['9'] && val2 === valorRango['5'])) {
      return 'muyDebil';
    }

    // Cartas de cara bajas offsuit (ej. J-2o, Q-3o, K-4o, A-2o a A-5o)
    // Se considera "carta de cara" a J, Q, K, A. Se considera "carta baja" a 2, 3, 4, 5, 6, 7, 8, 9.
    const isFaceCard = (r: Rango) => ['J', 'Q', 'K', 'A'].includes(r);
    const isLowCard = (r: Rango) => ['2', '3', '4', '5', '6', '7', '8', '9'].includes(r);

    if (isFaceCard(c1.rango) && isLowCard(c2.rango) && !isPair) {
        // Casos específicos mencionados en el texto del usuario
        if (
            (c1.rango === 'A' && (c2.rango === '2' || c2.rango === '3' || c2.rango === '4' || c2.rango === '5')) ||
            (c1.rango === 'K' && (c2.rango === '2' || c2.rango === '3' || c2.rango === '4')) ||
            (c1.rango === 'Q' && (c2.rango === '2' || c2.rango === '3')) ||
            (c1.rango === 'J' && c2.rango === '2')
        ) {
            return 'muyDebil';
        }
    }
  }

  // 2. Manos muy fuertes (Premium Pairs)
  if (isPair) {
    if (val1 === valorRango['A'] || val1 === valorRango['K']) return 'muyFuerte'; // AA, KK
  }

  // 3. Manos fuertes
  if (isPair) {
    if (val1 === valorRango['Q'] || val1 === valorRango['J'] || val1 === valorRango['10']) return 'fuerte'; // QQ, JJ, TT
  }

  if (!isPair) {
    if (suited && c1.rango === 'A' && val2 >= valorRango['Q']) return 'fuerte'; // AQs, AKs
    if (!suited && c1.rango === 'A' && c2.rango === 'K') return 'fuerte'; // AKo
    if (suited && c1.rango === 'K' && c2.rango === 'Q') return 'fuerte'; // KQs
  }

  // 4. Manos medias
  if (isPair) {
    if (val1 >= valorRango['7']) return 'media'; // 77, 88, 99
  }

  if (!isPair) {
    // Suited Connectors
    if (suited && val1 - val2 === 1 && val1 <= valorRango['J'] && val2 >= valorRango['5']) return 'media'; // JTs, T9s, 98s, 87s, 76s, 65s
    // Suited Aces (A9s, A8s)
    if (suited && c1.rango === 'A' && val2 >= valorRango['8']) return 'media';
    // Otras suited fuertes (KJs+, QJs+, JTs+)
    if (suited && val1 >= valorRango['J'] && val2 >= valorRango['9']) return 'media'; // KJs, QJs, J9s, T8s, etc. (simplified)
    // Offsuit Broadway (AQo, KJo, QJo, etc.)
    if (!suited && c1.rango === 'A' && c2.rango === 'Q') return 'media'; // AQo
    if (!suited && val1 >= valorRango['K'] && val2 >= valorRango['10']) return 'media';  // KQo, KJo, KTo
    if (!suited && val1 >= valorRango['Q'] && val2 >= valorRango['J']) return 'media'; // QJo, QTo
  }

  // 5. Cualquier otra mano se considera débil por defecto
  return 'debil';
};

// Función para sugerir una jugada (Call, Check, Fold, Raise)
const sugerirJugada = (
  equity: number, // Ahora usamos la Equity directamente
  potOdds: number,
  apuestaAEnfrentar: number,
  mejorManoActual: ResultadoMano | null,
  cartasComunitarias: Carta[],
  cartasManoJugador: Carta[] // Añadido como parámetro
): 'Call' | 'Check' | 'Fold' | 'Raise' | 'N/A' => {
  if (cartasManoJugador.length !== 2) {
    return 'N/A'; // No se puede sugerir sin 2 cartas de mano
  }

  // Lógica Pre-flop (0 cartas comunitarias)
  if (cartasComunitarias.length === 0) {
    const fuerzaPreFlop = evaluarManoInicialPreFlop(cartasManoJugador);

    if (apuestaAEnfrentar === 0) {
      return 'Check'; // Si no hay apuesta, siempre Check pre-flop
    } else {
      if (fuerzaPreFlop === 'muyDebil') {
        return 'Fold'; // Si es una mano muy débil y hay apuesta, siempre Fold
      }
      switch (fuerzaPreFlop) {
        case 'muyFuerte':
          return 'Raise'; // Manos premium, siempre subir
        case 'fuerte':
          return 'Raise'; // Manos muy buenas, generalmente subir
        case 'media':
          return 'Call'; // Manos jugables, pagar la apuesta
        case 'debil':
          return 'Fold'; // Default weak hands to fold if there's a bet
        default:
          return 'N/A';
      }
    }
  }

  // Lógica Post-flop (3 o más cartas comunitarias) - Lógica existente
  if (isNaN(equity) || isNaN(potOdds)) {
    return 'N/A';
  }

  if (apuestaAEnfrentar === 0) {
    return 'Check';
  }

  const UMBRAL_RAISE_MANO_FUERTE = 70; // Equity para manos muy fuertes (ej. Póker, Full House)
  const UMBRAL_RAISE_PROYECTO_FUERTE = 45; // Equity para proyectos fuertes (ej. Color, Escalera)

  if (mejorManoActual && apuestaAEnfrentar > 0) {
    // Raise por valor: Si la mano es ya muy fuerte (Trío o mejor) Y la Equity es alta
    if (mejorManoActual.tipo >= TipoMano.TRIO && equity >= UMBRAL_RAISE_MANO_FUERTE) {
      return 'Raise';
    }
    // Raise con proyecto fuerte: Si la Equity es suficientemente alta para un proyecto (ej. en el flop)
    // y no es una mano ya hecha de valor que justifique un raise más conservador.
    if (cartasComunitarias.length === 3 && equity >= UMBRAL_RAISE_PROYECTO_FUERTE && mejorManoActual.tipo < TipoMano.TRIO) {
        return 'Raise';
    }
  }

  // Call vs Fold basado en Pot Odds y Equity
  if (equity >= potOdds) {
    return 'Call'; // Si tu Equity es mayor o igual a las pot odds, haz Call
  } else {
    return 'Fold'; // Si tu Equity es menor que las pot odds, haz Fold
  }
};


// Componente para mostrar una carta individual
interface PropsCartaDisplay {
  carta: Carta;
  onClick?: (carta: Carta) => void; // Propiedad opcional para manejar clics
  estaSeleccionada?: boolean; // Propiedad opcional para indicar si la carta está seleccionada
}

const CartaDisplay: React.FC<PropsCartaDisplay> = ({ carta, onClick, estaSeleccionada }) => {
  const claseColorTexto = carta.color === 'rojo' ? 'text-red-500' : 'text-gray-800';
  const claseSeleccion = estaSeleccionada ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200';
  const claseCursor = onClick ? 'cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300' : '';

  return (
    <div
      className={`bg-white border-2 rounded-xl shadow-lg flex flex-col items-center justify-between p-3 m-1 w-20 h-28 sm:w-24 sm:h-32 text-lg sm:text-xl font-bold ${claseSeleccion} ${claseCursor} relative overflow-hidden`}
      style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)',
        // Se eliminó la propiedad fontFamily para heredar del RootLayout
      }}
      onClick={() => onClick && onClick(carta)}
    >
      <div className={`self-start ${claseColorTexto} font-extrabold`}>{carta.rango}</div>
      <div className={`text-4xl sm:text-5xl ${claseColorTexto} drop-shadow-sm`}>{carta.simbolo}</div>
      <div className={`self-end transform rotate-180 ${claseColorTexto} font-extrabold`}>{carta.rango}</div>
      
      {/* Decorative corner elements */}
      <div className="absolute top-0 right-0 w-3 h-3 bg-gradient-to-br from-gray-100 to-transparent rounded-bl-lg opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-gray-100 to-transparent rounded-tr-lg opacity-50"></div>
    </div>
  );
};

// Función para parsear la entrada de texto de cartas
const parseCardInput = (rankInput: string, suitInput: Palo | null, mazoCompleto: Carta[], existingCards: Carta[]): { card: Carta | null, error: string | null } => {
  if (!rankInput || !suitInput) {
    return { card: null, error: 'Por favor, ingresa un rango y selecciona un palo.' };
  }

  const allowedRanks: Record<string, Rango> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '10': '10', 'T': '10', // Allow 'T' for '10' as well
    'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };

  const rango = allowedRanks[rankInput.toUpperCase()];
  if (!rango) {
    return { card: null, error: `Rango inválido: "${rankInput}". Usa A, K, Q, J, T/10, 9, 8, 7, 6, 5, 4, 3, 2.` };
  }

  const foundCard = mazoCompleto.find(
    c => c.rango === rango && c.palo === suitInput
  );

  if (!foundCard) {
    return { card: null, error: `Carta no encontrada en el mazo: ${rankInput}${suitInput}.` };
  }

  // Check for duplicates with existing cards (hand + community)
  if (existingCards.some(ec => sonCartasIguales(ec, foundCard))) {
    return { card: null, error: `La carta ${rankInput}${suitInput} ya está en juego.` };
  }

  return { card: foundCard, error: null };
};

// Helper to calculate probability from outs and remaining cards
const calculateProbabilityForDraw = (outs: number, remainingCards: number, numCardsToCome: number): { probNext: string; probTotal: string } => {
  if (remainingCards === 0 || outs === 0) {
    return { probNext: '0.00', probTotal: '0.00' };
  }

  const probNext = (outs / remainingCards) * 100;
  let probTotal = 0;

  if (numCardsToCome === 1) { // Turn to River (1 card to come)
    probTotal = probNext; 
  } else if (numCardsToCome === 2) { // Flop to River (2 cards to come)
    // More accurate calculation for hitting at least one out in 2 cards
    if (remainingCards < 2 || remainingCards - outs < 1) { // Edge cases for very few cards left
        probTotal = Math.min(100, outs * 4); // Fallback to rule of 4 for very small numbers, cap at 100%
    } else {
        const probMissFirst = (remainingCards - outs) / remainingCards;
        const probMissSecond = (remainingCards - outs - 1) / (remainingCards - 1);
        probTotal = (1 - (probMissFirst * probMissSecond)) * 100;
    }
  } else {
    probTotal = probNext; // Default to next card if not 1 or 2 cards to come (e.g., pre-flop)
  }

  return {
    probNext: probNext.toFixed(2),
    probTotal: probTotal.toFixed(2),
  };
};

// Helper to check for straight draws (OESD/Gutshot)
const getStraightDrawOuts = (allCards: Carta[], mazoRestante: Carta[]): { outs: number; type: 'OESD' | 'Gutshot' | 'Both' | 'None' } => {
    const ranksPresent = new Set<number>();
    for (const card of allCards) {
        ranksPresent.add(obtenerValorNumericoCarta(card));
    }
    // Add Ace as 1 for A-5 straight
    if (ranksPresent.has(valorRango['A'])) {
        ranksPresent.add(1);
    }

    // Check if a straight is already made with the current cards
    const currentBestHand = obtenerMejorMano(allCards);
    if (currentBestHand.tipo === TipoMano.ESCALERA || currentBestHand.tipo === TipoMano.ESCALERA_DE_COLOR || currentBestHand.tipo === TipoMano.ESCALERA_REAL_DE_COLOR) {
        return { outs: 0, type: 'None' };
    }

    const potentialStraightOuts = new Set<number>();
    let hasOESD = false;
    let hasGutshot = false;

    // Iterate through all possible 5-card straight sequences
    // A-5 (1-5) up to 10-A (10-14)
    for (let startRank = 1; startRank <= 10; startRank++) {
        const requiredRanks = [];
        for (let i = 0; i < 5; i++) {
            requiredRanks.push(startRank + i);
        }

        let matchedCount = 0;
        let missingRanksInSequence: number[] = [];

        for (const rank of requiredRanks) {
            if (ranksPresent.has(rank)) {
                matchedCount++;
            } else {
                missingRanksInSequence.push(rank);
            }
        }

        if (matchedCount === 4 && missingRanksInSequence.length === 1) {
            const missingRank = missingRanksInSequence[0];
            const isInternalGap = requiredRanks.indexOf(missingRank) > 0 && requiredRanks.indexOf(missingRank) < 4;

            if (isInternalGap) { // This is a gutshot
                potentialStraightOuts.add(missingRank);
                hasGutshot = true;
            } else { // This is an open-ended straight draw (OESD)
                potentialStraightOuts.add(missingRank);
                hasOESD = true;
            }
        }
    }

    let totalOuts = 0;
    for (const rank of potentialStraightOuts) {
        totalOuts += mazoRestante.filter(c => obtenerValorNumericoCarta(c) === rank).length;
    }

    let type: 'OESD' | 'Gutshot' | 'Both' | 'None' = 'None';
    if (hasOESD && hasGutshot) type = 'Both';
    else if (hasOESD) type = 'OESD';
    else if (hasGutshot) type = 'Gutshot';

    return { outs: totalOuts, type };
};


const getDynamicDrawProbabilities = (
  playerHand: Carta[],
  communityCards: Carta[],
  mazoCompleto: Carta[]
) => {
  const allCards = [...playerHand, ...communityCards];
  const cardsSeen = new Set(allCards.map(c => `${c.rango}${c.palo}`));
  const mazoRestante = mazoCompleto.filter(cartaMazo =>
    !cardsSeen.has(`${cartaMazo.rango}${cartaMazo.palo}`)
  );
  const remainingCardsInDeck = mazoRestante.length;

  const numCardsToCome = 5 - communityCards.length; // 2 for flop, 1 for turn, 0 for river

  const dynamicDraws: {
    flushDraw?: { outs: number; probNext: string; probTotal: string };
    straightDraw?: { outs: number; probNext: string; probTotal: string; type: 'OESD' | 'Gutshot' | 'Both' | 'None' };
    setDraw?: { outs: number; probNext: string; probTotal: string };
    quadsDraw?: { outs: number; probNext: string; probTotal: string };
  } = {};

  // --- Flush Draw ---
  const suitCounts = new Map<Palo, number>();
  for (const card of allCards) {
    suitCounts.set(card.palo, (suitCounts.get(card.palo) || 0) + 1);
  }

  let flushSuit: Palo | undefined;
  for (const [palo, count] of suitCounts.entries()) {
    if (count === 4) { // Needs 4 cards of a suit for a flush draw
      flushSuit = palo;
      break;
    }
  }

  if (flushSuit) {
    const outs = mazoRestante.filter(c => c.palo === flushSuit).length;
    if (outs > 0) {
      const { probNext, probTotal } = calculateProbabilityForDraw(outs, remainingCardsInDeck, numCardsToCome);
      dynamicDraws.flushDraw = { outs, probNext, probTotal };
    }
  }

  // --- Straight Draws (OESD and Gutshot) ---
  const { outs: straightOuts, type: straightType } = getStraightDrawOuts(allCards, mazoRestante);
  if (straightOuts > 0) {
    const { probNext, probTotal } = calculateProbabilityForDraw(straightOuts, remainingCardsInDeck, numCardsToCome);
    dynamicDraws.straightDraw = { outs: straightOuts, probNext, probTotal, type: straightType };
  }

  // --- Set Draw / Quads Draw ---
  const rankCounts = new Map<Rango, number>();
  for (const card of allCards) {
    rankCounts.set(card.rango, (rankCounts.get(card.rango) || 0) + 1);
  }

  // Check for Set Draw (pocket pair + 1 on board = 3 of a kind)
  if (playerHand.length === 2 && playerHand[0].rango === playerHand[1].rango) {
      const pairRank = playerHand[0].rango;
      const countOnBoard = communityCards.filter(c => c.rango === pairRank).length;
      if (countOnBoard === 0) { // Player has a pocket pair, no card of that rank on board yet
          const outs = mazoRestante.filter(c => c.rango === pairRank).length; // Should be 2
          if (outs > 0) {
              const { probNext, probTotal } = calculateProbabilityForDraw(outs, remainingCardsInDeck, numCardsToCome);
              dynamicDraws.setDraw = { outs, probNext, probTotal };
          }
      } else if (countOnBoard === 1) { // Player has a pocket pair + one on board (already a set)
          // This is a quads draw (from set to quads)
          const outs = mazoRestante.filter(c => c.rango === pairRank).length; // Should be 1
          if (outs > 0) {
              const { probNext, probTotal } = calculateProbabilityForDraw(outs, remainingCardsInDeck, numCardsToCome);
              dynamicDraws.quadsDraw = { outs, probNext, probTotal };
          }
      }
  } else { // Player doesn't have a pocket pair, check for set draw from a single card in hand
      for (const handCard of playerHand) {
          const countOnBoard = communityCards.filter(c => c.rango === handCard.rango).length;
          if (countOnBoard === 1) { // Player has one card, one on board (pair) -> set draw
              const outs = mazoRestante.filter(c => c.rango === handCard.rango).length; // Should be 2
              if (outs > 0) {
                  const { probNext, probTotal } = calculateProbabilityForDraw(outs, remainingCardsInDeck, numCardsToCome);
                  dynamicDraws.setDraw = { outs, probNext, probTotal };
              }
          } else if (countOnBoard === 2) { // Player has one card, two on board (set) -> quads draw
              const outs = mazoRestante.filter(c => c.rango === handCard.rango).length; // Should be 1
              if (outs > 0) {
                  const { probNext, probTotal } = calculateProbabilityForDraw(outs, remainingCardsInDeck, numCardsToCome);
                  dynamicDraws.quadsDraw = { outs, probNext, probTotal };
              }
          }
      }
  }
  return dynamicDraws;
};


// Componente principal de la aplicación
const App: React.FC = () => {
  const [mazoCompleto, setMazoCompleto] = useState<Carta[]>([]);
  const [cartasManoJugador, setCartasManoJugador] = useState<Carta[]>([]);
  const [cartasComunitarias, setCartasComunitarias] = useState<Carta[]>([]);
  const [resultadoMano, setResultadoMano] = useState<ResultadoMano | null>(null);
  const [outsResult, setOutsResult] = useState<{
    outs: number;
    probabilidadSiguienteCarta: string;
    probabilidadTurnRiver: string;
    cartasQueDanOuts: Carta[];
  } | null>(null);
  const [dynamicDrawsResult, setDynamicDrawsResult] = useState<ReturnType<typeof getDynamicDrawProbabilities> | null>(null);


  // Nuevos estados para Pot Odds y Equity
  const [boteActual, setBoteActual] = useState<number>(0);
  const [apuestaAEnfrentar, setApuestaAEnfrentar] = useState<number>(0);
  const [potOddsCalculadas, setPotOddsCalculadas] = useState<string>('0.00');
  const [equityCalculada, setEquityCalculada] = useState<string>('0.00');
  const [calculandoEquity, setCalculandoEquity] = useState<boolean>(false); // Para el indicador de carga
  const [sugerenciaJugada, setSugerenciaJugada] = useState<'Call' | 'Check' | 'Fold' | 'Raise' | 'N/A'>('N/A');
  const [preFlopGuidance, setPreFlopGuidance] = useState<React.ReactElement | null>(null); // Nuevo estado para la guía pre-flop

  // Estados para la nueva entrada de cartas
  const [currentRankInput, setCurrentRankInput] = useState<string>('');
  const [currentSuitInput, setCurrentSuitInput] = useState<Palo | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Inicializar el mazo completo al cargar el componente
  useEffect(() => {
    const nuevoMazo = crearMazo();
    setMazoCompleto(nuevoMazo);
  }, []);

  // Recalcular mazo disponible (now just a filtered list, not a state) and perform all calculations
  useEffect(() => {
    // Determinar si tenemos suficientes cartas para cualquier sugerencia
    const hasHoleCards = cartasManoJugador.length === 2;
    const numCommunityCards = cartasComunitarias.length;

    // Calcular la mejor mano localmente
    const currentBestHand = (cartasManoJugador.length + numCommunityCards >= 5)
      ? obtenerMejorMano([...cartasManoJugador, ...cartasComunitarias])
      : null;
    setResultadoMano(currentBestHand); // Actualiza el estado una vez

    if (hasHoleCards) {
      if (numCommunityCards >= 3) { // Flop, Turn, River
        const resultadoOuts = calcularOutsYProbabilidades(
          cartasManoJugador,
          cartasComunitarias,
          mazoCompleto
        );
        setOutsResult(resultadoOuts);

        const potOdds = calcularPotOdds(boteActual, apuestaAEnfrentar);
        setPotOddsCalculadas(potOdds);

        // Solo calcular Equity y Dynamic Draws si estamos en Flop o Turn (antes del River)
        if (numCommunityCards < 5) {
            setCalculandoEquity(true);
            const timer = setTimeout(() => {
                const equity = calcularEquity(cartasManoJugador, cartasComunitarias, mazoCompleto);
                setEquityCalculada(equity);
                setCalculandoEquity(false);
                // Usa la variable local currentBestHand aquí
                setSugerenciaJugada(sugerirJugada(parseFloat(equity), parseFloat(potOdds), apuestaAEnfrentar, currentBestHand, cartasComunitarias, cartasManoJugador));
            }, 50);
            setPreFlopGuidance(null);

            // Calculate dynamic draws
            const dynamicDraws = getDynamicDrawProbabilities(cartasManoJugador, cartasComunitarias, mazoCompleto);
            setDynamicDrawsResult(dynamicDraws);

            return () => clearTimeout(timer);
        } else { // River (5 cartas comunitarias)
            setCalculandoEquity(false); // No se calcula Equity en el River para mejorar
            setEquityCalculada('N/A'); // No hay más equity de mejora
            setSugerenciaJugada(sugerirJugada(0, parseFloat(potOdds), apuestaAEnfrentar, currentBestHand, cartasComunitarias, cartasManoJugador)); // Equity no es factor de mejora
            setPreFlopGuidance(null);
            setDynamicDrawsResult(null); // No hay proyectos en el river
        }

      } else { // Etapa Pre-flop (0 cartas comunitarias) o con 1 o 2 cartas comunitarias
        setOutsResult(null);
        setDynamicDrawsResult(null); // No hay proyectos relevantes antes del flop
        // Siempre calcula las Pot Odds si hay una apuesta, independientemente de las cartas comunitarias
        setPotOddsCalculadas(calcularPotOdds(boteActual, apuestaAEnfrentar)); 
        setEquityCalculada('N/A');
        setCalculandoEquity(false);
        setSugerenciaJugada(sugerirJugada(0, parseFloat(calcularPotOdds(boteActual, apuestaAEnfrentar)), apuestaAEnfrentar, null, cartasComunitarias, cartasManoJugador));

        // Generar guía pre-flop detallada solo si estamos en la etapa pre-flop (0 cartas comunitarias)
        if (numCommunityCards === 0) {
            const [c1, c2] = ordenarCartas(cartasManoJugador);
            const isPair = c1.rango === c2.rango;
            const suited = c1.palo === c2.palo;
            let handTypeDescription = '';

            if (isPair) {
                handTypeDescription = `Tienes una pareja de ${c1.rango}s.`;
            } else if (suited) {
                handTypeDescription = `Tienes ${c1.rango}${c2.rango} del mismo palo (${c1.palo}).`;
            } else {
                handTypeDescription = `Tienes ${c1.rango}${c2.rango} de palos diferentes.`;
            }

            const preFlopText = (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
                    <p className="text-purple-700 text-sm mt-2 leading-relaxed">
                        En el poker, existen <strong className="text-purple-800">1326</strong> combinaciones posibles de dos cartas iniciales.
                        Las manos como la tuya, <strong className="text-purple-800">{handTypeDescription}</strong>, son solo una peque&ntilde;a parte de ellas.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <ul className="text-purple-700 text-sm list-disc list-inside space-y-1">
                            <li>Probabilidad de recibir <strong>cualquier pareja</strong>: <strong className="text-purple-800">5.88%</strong></li>
                            <li>Probabilidad de recibir <strong>Ases (AA)</strong>: <strong className="text-purple-800">0.45%</strong> (1 de cada 221 manos)</li>
                            <li>Probabilidad de recibir <strong>cualquier mano suited</strong> (del mismo palo): <strong className="text-purple-800">23.5%</strong></li>
                            <li>Probabilidad de recibir <strong>cualquier mano conectada</strong> (ej. 76): <strong className="text-purple-800">~15.7%</strong></li>
                        </ul>
                    </div>
                    <h4 className="text-purple-800 text-base font-bold mt-6 mb-3 flex items-center">
                        <Target className="w-5 h-5 mr-2" />
                        Las Peores Manos de P&oacute;ker (Pre-flop):
                    </h4>
                    <p className="text-purple-700 text-sm mb-3 leading-relaxed">
                        Es crucial entender las manos m&aacute;s d&eacute;biles para saber cu&aacute;ndo retirarse. Aqu&iacute; est&aacute;n algunas de las peores manos que puedes recibir:
                    </p>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <ul className="text-red-700 text-sm list-disc list-inside space-y-1">
                            <li><strong>2-7 Offsuit</strong>: Considerada la peor mano. Las cartas m&aacute;s bajas y sin potencial de escalera o color.</li>
                            <li><strong>2-8 Offsuit</strong>: Marginalmente mejor que 2-7, pero igual de injugable.</li>
                            <li><strong>3-8 y 3-7 Offsuit</strong>: Tambi&eacute;n muy d&eacute;biles, sin potencial de escalera o color significativo.</li>
                            <li><strong>2-10 Offsuit</strong>: Famosa como la &quot;mano de Doyle Brunson&quot;, pero estad&iacute;sticamente una de las peores.</li>
                            <li><strong>9 y 5 Offsuit</strong>: Conocida como &quot;Dolly Parton&quot;. No es una mano con ventaja estad&iacute;stica a largo plazo.</li>
                            <li><strong>Cartas bajas y de cara Offsuit</strong> (ej. J-2o, Q-3o, K-4o, A-2o a A-5o): Un error com&uacute;n de principiantes es jugar cualquier carta con una figura.</li>
                        </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
                        <p className="text-green-800 text-sm font-semibold">
                            💡 <strong>Consejo General:</strong> Si te enfrentas a una apuesta con una de estas manos muy d&eacute;biles, la mejor decisi&oacute;n suele ser <strong>Fold</strong>.
                        </p>
                    </div>
                </div>
            );
            setPreFlopGuidance(preFlopText);
        } else {
            setPreFlopGuidance(null); // Limpiar la guía pre-flop en otras etapas
        }
      }
    } else { // No hay suficientes cartas de mano
      setOutsResult(null);
      setPotOddsCalculadas('N/A'); // Default to N/A if no hole cards
      setEquityCalculada('0.00');
      setSugerenciaJugada('N/A');
      setCalculandoEquity(false);
      setPreFlopGuidance(null); // Limpiar la guía pre-flop
      setDynamicDrawsResult(null); // Limpiar proyectos dinámicos
    }
  }, [cartasManoJugador, cartasComunitarias, boteActual, apuestaAEnfrentar, mazoCompleto]); // Dependencias actualizadas

  // Manejar la eliminación de una carta de la mano del jugador
  const eliminarCartaMano = useCallback((cartaAEliminar: Carta) => {
    setCartasManoJugador(prevCartas => prevCartas.filter(c => !sonCartasIguales(c, cartaAEliminar)));
  }, []);

  // Manejar la eliminación de una carta comunitaria
  const eliminarCartaComunitaria = useCallback((cartaAEliminar: Carta) => {
    setCartasComunitarias(prevCartas => prevCartas.filter(c => !sonCartasIguales(c, cartaAEliminar)));
  }, []);

  // Reiniciar todas las selecciones y valores de pot odds
  const reiniciarSeleccion = useCallback(() => {
    setCartasManoJugador([]);
    setCartasComunitarias([]);
    setResultadoMano(null);
    setOutsResult(null);
    setBoteActual(0);
    setApuestaAEnfrentar(0);
    setPotOddsCalculadas('0.00');
    setEquityCalculada('0.00');
    setSugerenciaJugada('N/A');
    setCalculandoEquity(false);
    setPreFlopGuidance(null); // Limpiar la guía pre-flop al reiniciar
    setDynamicDrawsResult(null); // Limpiar proyectos dinámicos
    setCurrentRankInput('');
    setCurrentSuitInput(null);
    setInputError(null);
  }, []);

  // Handler para añadir una carta
  const handleAddCard = useCallback(() => {
    const allSelectedCards = [...cartasManoJugador, ...cartasComunitarias];
    const { card, error } = parseCardInput(currentRankInput, currentSuitInput, mazoCompleto, allSelectedCards);

    if (error) {
      setInputError(error);
      return;
    }

    if (card) {
      if (cartasManoJugador.length < 2) {
        setCartasManoJugador(prev => [...prev, card]);
      } else if (cartasComunitarias.length < 5) {
        setCartasComunitarias(prev => [...prev, card]);
      } else {
        setInputError('Ya has añadido el máximo de cartas (2 de mano y 5 comunitarias).');
        return;
      }
      setCurrentRankInput(''); // Limpiar input después de añadir
      setCurrentSuitInput(null); // Limpiar selección de palo
      setInputError(null); // Limpiar errores
    }
  }, [currentRankInput, currentSuitInput, mazoCompleto, cartasManoJugador, cartasComunitarias]);

  // Datos para el gráfico de probabilidades
  const chartData = [];
  if (outsResult) {
    chartData.push({
      name: 'Prob. Siguiente Carta',
      value: parseFloat(outsResult.probabilidadSiguienteCarta),
      fill: '#6366f1' // Indigo 500
    });
    // Solo añadir Prob. Turn/River si estamos en el Flop (3 cartas comunitarias)
    if (cartasComunitarias.length === 3) {
      chartData.push({
        name: 'Prob. Turn/River',
        value: parseFloat(outsResult.probabilidadTurnRiver),
        fill: '#10b981' // Emerald 500
      });
    }
  }

  // Solo añadir la Equidad si ya se calculó y no es N/A, y si no estamos en el River
  if (!calculandoEquity && equityCalculada !== 'N/A' && cartasComunitarias.length < 5) { 
     chartData.push({
      name: 'Equidad',
      value: parseFloat(equityCalculada),
      fill: '#f59e0b' // Amber 500
    });
  }

  // Agrupar cartas que dan outs por rango para una visualización compacta
  const outsPorRango: { [key: string]: number } = {};
  if (outsResult && outsResult.cartasQueDanOuts && outsResult.cartasQueDanOuts.length > 0) {
    outsResult.cartasQueDanOuts.forEach(carta => {
      outsPorRango[carta.rango] = (outsPorRango[carta.rango] || 0) + 1;
    });
  }

  const outsSummary = Object.entries(outsPorRango)
    .sort(([rangoA], [rangoB]) => valorRango[rangoB as Rango] - valorRango[rangoA as Rango])
    .map(([rango, count]) => {
      let displayRango = rango;
      // Convert single letters for ranks to full names for better readability
      if (rango === 'A') displayRango = 'As';
      if (rango === 'K') displayRango = 'Rey';
      if (rango === 'Q') displayRango = 'Reina';
      if (rango === 'J') displayRango = 'Jota';
      if (rango === 'T') displayRango = 'Diez';
      return `${displayRango} (${count} cartas)`;
    })
    .join(', ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header profesional */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-3 rounded-xl shadow-lg">
                <Spades className="w-8 h-8 text-slate-900" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
                  ASeptar
                </h1>
                <p className="text-slate-300 text-sm font-medium">Decide como un profesional.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-slate-300">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Análisis</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <Calculator className="w-5 h-5" />
                <span className="text-sm font-medium">Cálculos Rápidos</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-3xl font-bold text-slate-800 mb-4">
              Tu asistente de póker que te guía jugada a jugada para tomar decisiones ganadoras con la confianza de un as en la manga.
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Herramienta para análisis de manos de Texas Hold'em con cálculos de equity, outs y sugerencias de jugada basadas en matemáticas avanzadas.
            </p>
          </div>

          {/* Error display */}
          {inputError && (
            <div className="mb-8 max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-6 rounded-r-xl shadow-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">!</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-red-800 font-bold text-lg">Error de entrada</h3>
                    <p className="text-red-700 mt-1">{inputError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card input section */}
          <div className="mb-12">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Añadir Carta</h3>
              <p className="text-slate-600 text-sm mt-1">Ingresa el rango y selecciona el palo</p>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                {/* Rank input */}
                <div className="flex flex-col items-center">
                  <label htmlFor="rankInput" className="text-slate-700 font-medium mb-3">
                    Rango
                  </label>
                  <input
                    type="text"
                    id="rankInput"
                    value={currentRankInput}
                    onChange={(e) => setCurrentRankInput(e.target.value)}
                    className="w-24 h-12 text-gray-800 p-3 border border-slate-300 rounded-lg text-center text-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    maxLength={2}
                    placeholder="A"
                  />
                  <p className="text-slate-500 text-xs mt-2">A, K, Q, J, 10/T, 9-2</p>
                </div>

                {/* Suit selection */}
                <div className="flex flex-col items-center">
                  <label className="text-slate-700 font-medium mb-3">Palo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { palo: 'Corazones', simbolo: '♥', color: 'text-red-500' },
                      { palo: 'Diamantes', simbolo: '♦', color: 'text-red-500' },
                      { palo: 'Picas', simbolo: '♠', color: 'text-slate-800' },
                      { palo: 'Tréboles', simbolo: '♣', color: 'text-slate-800' }
                    ].map(({ palo, simbolo, color }) => (
                      <button
                        key={palo}
                        onClick={() => setCurrentSuitInput(palo as Palo)}
                        className={`w-16 h-16 rounded-lg border-2 transition-all duration-200 ${
                          currentSuitInput === palo 
                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                            : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span className={`text-2xl font-bold ${
                          currentSuitInput === palo ? 'text-blue-600' : color
                        }`}>
                          {simbolo}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleAddCard}
                    className="cursor-pointer bg-indigo-800 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Cards display grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Player hand */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Tu Mano</h3>
              <p className="text-slate-600 text-sm">2 cartas</p>
            </div>
            <div className="p-6">
              <div className="flex justify-center items-center min-h-[140px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                {cartasManoJugador.length === 0 ? (
                  <div className="text-center">
                    <Spades className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500">Añade tus cartas de mano</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {cartasManoJugador.map((carta, index) => (
                      <CartaDisplay
                        key={`mano-${carta.rango}-${carta.palo}-${index}`}
                        carta={carta}
                        onClick={eliminarCartaMano}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Community cards */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Cartas Comunitarias</h3>
              <p className="text-slate-600 text-sm">Hasta 5 cartas</p>
            </div>
            <div className="p-6">
              <div className="flex justify-center items-center min-h-[140px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                {cartasComunitarias.length === 0 ? (
                  <div className="text-center">
                    <Club className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500">Añade cartas del board</p>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {cartasComunitarias.map((carta, index) => (
                      <CartaDisplay
                        key={`comunitaria-${carta.rango}-${carta.palo}-${index}`}
                        carta={carta}
                        onClick={eliminarCartaComunitaria}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Pot values section */}
        <div className="mb-12">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Valores del Bote</h3>
              <p className="text-slate-600 text-sm">Para cálculos de pot odds</p>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="boteActual" className="block text-slate-700 font-medium mb-2">
                    Bote Actual
                  </label>
                  <input
                    type="number"
                    id="boteActual"
                    value={boteActual === 0 ? '' : boteActual}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBoteActual(value === '' ? 0 : Math.max(0, parseInt(value) || 0));
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                    min="0"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label htmlFor="apuestaAEnfrentar" className="block text-slate-700 font-medium mb-2">
                    Apuesta a Enfrentar
                  </label>
                  <input
                    type="number"
                    id="apuestaAEnfrentar"
                    value={apuestaAEnfrentar === 0 ? '' : apuestaAEnfrentar}
                    onChange={(e) => {
                      const value = e.target.value;
                      setApuestaAEnfrentar(value === '' ? 0 : Math.max(0, parseInt(value) || 0));
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-black"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reset button */}
        <div className="text-center mb-12">
          <button
            onClick={reiniciarSeleccion}
            className="cursor-pointer bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar</span>
          </button>
        </div>

          {/* Results sections */}
        {resultadoMano && (
          <div className="mb-12">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Mejor Mano</h3>
              </div>
              
              <div className="p-6">
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-slate-900 mb-6">{resultadoMano.descripcion}</h4>
                  <div className="flex justify-center gap-3 flex-wrap mb-6">
                    {resultadoMano.cartasClave.map((carta, index) => (
                      <CartaDisplay key={`res-clave-${carta.rango}-${carta.palo}-${index}`} carta={carta} />
                    ))}
                  </div>
                  
                  {resultadoMano.kickers.length > 0 && (
                    <div>
                      <h5 className="text-lg font-semibold text-slate-700 mb-4">Kickers</h5>
                      <div className="flex justify-center gap-3 flex-wrap">
                        {resultadoMano.kickers.map((carta, index) => (
                          <CartaDisplay key={`res-kicker-${carta.rango}-${carta.palo}-${index}`} carta={carta} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

           {/* Probability analysis */}
        {outsResult && (cartasManoJugador.length === 2 && cartasComunitarias.length >= 3 && cartasComunitarias.length < 5) && (
          <div className="mb-12">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Análisis de Probabilidades
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-slate-900 mb-2">
                        {outsResult.outs}
                      </div>
                      <p className="text-slate-600">Outs disponibles</p>
                    </div>
                    
                    {outsSummary && (
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <h5 className="font-semibold text-slate-800 mb-2">Cartas que te dan una mejor mano:</h5>
                        <p className="text-slate-700 text-sm">{outsSummary}</p>
                        <p className="text-slate-500 text-xs mt-2">
                          *Los números entre paréntesis indican cuántas cartas de ese rango quedan en el mazo y te darían un out.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="h-64">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="name" 
                            tickLine={false} 
                            axisLine={{ stroke: '#94a3b8' }} 
                            style={{ fontSize: '0.75rem' }} 
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            tickLine={false} 
                            axisLine={{ stroke: '#94a3b8' }} 
                            style={{ fontSize: '0.75rem' }} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: '1px solid #e2e8f0',
                              backgroundColor: 'white',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              color: 'gray'
                            }} 
                            formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-slate-50 rounded-lg">
                        <p className="text-slate-500 text-center">
                          {calculandoEquity ? (
                            <div className="flex items-center space-x-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span>Calculando...</span>
                            </div>
                          ) : (
                            'Añade cartas para ver probabilidades'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Project Analysis */}
        {dynamicDrawsResult && Object.keys(dynamicDrawsResult).length > 0 && cartasComunitarias.length >= 3 && cartasComunitarias.length < 5 && (
            <div className="mb-12">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                            <Calculator className="w-5 h-5 mr-2" />
                            Análisis de Proyectos
                        </h3>
                        <p className="text-slate-600 text-sm mt-1">Probabilidades de completar tus proyectos de mano.</p>
                    </div>
                    <div className="p-6 grid md:grid-cols-2 gap-6 text-slate-700">
                        {dynamicDrawsResult.flushDraw && (
                            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <span>Proyecto de Color (Flush Draw):</span>
                                <span className="font-semibold">{dynamicDrawsResult.flushDraw.probTotal}%</span>
                            </div>
                        )}
                        {dynamicDrawsResult.straightDraw && (
                            <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-200">
                                <span>Proyecto de Escalera ({dynamicDrawsResult.straightDraw.type === 'OESD' ? 'Abierta' : dynamicDrawsResult.straightDraw.type === 'Gutshot' ? 'Interna' : 'Mixta'}):</span>
                                <span className="font-semibold">{dynamicDrawsResult.straightDraw.probTotal}%</span>
                            </div>
                        )}
                        {dynamicDrawsResult.setDraw && (
                            <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <span>Proyecto de Trío (Set Draw):</span>
                                <span className="font-semibold">{dynamicDrawsResult.setDraw.probTotal}%</span>
                            </div>
                        )}
                        {dynamicDrawsResult.quadsDraw && (
                            <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                <span>Proyecto de Póker (Quads Draw):</span>
                                <span className="font-semibold">{dynamicDrawsResult.quadsDraw.probTotal}%</span>
                            </div>
                        )}
                        {Object.keys(dynamicDrawsResult).length === 0 && (
                            <p className="col-span-2 text-center text-slate-500">
                                No hay proyectos de mano significativos en este momento.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )}


          {/* Decision section */}
        {cartasManoJugador.length === 2 && (
          <div className="mb-12">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Decisión Recomendada
                </h3>
              </div>
              
              <div className="p-6">
                {cartasComunitarias.length === 0 ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h4 className="text-xl font-semibold text-slate-800 mb-4">Pre-flop</h4>
                      <div className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold text-lg ${
                        sugerenciaJugada === 'Call' ? 'bg-green-100 text-green-800 border border-green-200' :
                        sugerenciaJugada === 'Check' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        sugerenciaJugada === 'Fold' ? 'bg-red-100 text-red-800 border border-red-200' :
                        sugerenciaJugada === 'Raise' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {sugerenciaJugada}
                      </div>
                    </div>
                    {preFlopGuidance}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900 mb-2">
                          {potOddsCalculadas === 'N/A' ? potOddsCalculadas : `${potOddsCalculadas}%`}
                        </div>
                        <p className="text-slate-600">Pot Odds</p>
                        <p className="text-slate-500 text-xs mt-1">
                          (El porcentaje del bote que te cuesta igualar)
                        </p>
                        {apuestaAEnfrentar === 0 && (
                          <p className="text-slate-500 text-xs mt-1">
                            Las Pot Odds se calculan cuando hay una apuesta a enfrentar.
                          </p>
                        )}
                      </div>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900 mb-2">
                          {equityCalculada === 'N/A' ? equityCalculada : `${equityCalculada}%`}
                        </div>
                        <p className="text-slate-600">Tu Equity</p>
                        <p className="text-slate-500 text-xs mt-1">
                          (Probabilidad de ganar el bote)
                        </p>
                        {calculandoEquity && (
                          <p className="text-slate-500 text-xs mt-1">Calculando...</p>
                        )}
                      </div>
                    </div>

                    <div className="text-center mt-6">
                      <div className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold text-lg ${
                        sugerenciaJugada === 'Call' ? 'bg-green-100 text-green-800 border border-green-200' :
                        sugerenciaJugada === 'Check' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        sugerenciaJugada === 'Fold' ? 'bg-red-100 text-red-800 border border-red-200' :
                        sugerenciaJugada === 'Raise' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {sugerenciaJugada}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h5 className="font-semibold text-slate-800 mb-2">Metodología</h5>
                      <div className="text-slate-700 text-sm space-y-1">
                        <p>• <strong>Pre-flop:</strong> Basado en fuerza de mano inicial</p>
                        <p>• <strong>Post-flop:</strong> La sugerencia se basa en la comparación de tu <strong>Equity</strong> (probabilidad de ganar el bote) vs. las <strong>Pot Odds</strong> (el porcentaje del bote que te cuesta igualar la apuesta).</p>
                        <p>• <strong>Call:</strong> Tu Equity es mayor o igual que las Pot Odds. Es una jugada matemáticamente rentable a largo plazo.</p>
                        <p>• <strong>Fold:</strong> Tu Equity es menor que las Pot Odds. No es rentable igualar la apuesta.</p>
                        <p>• <strong>Raise:</strong> Se sugiere para manos muy fuertes o proyectos con alta equity que tienen buenas probabilidades de mejorar y ganar un bote más grande.</p>
                        <p className="mt-2 text-xs text-slate-500">
                          *Recuerda que estas son sugerencias matemáticas. El póker también implica lectura de oponentes y dinámica de mesa.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-2 rounded-lg">
                <Spades className="w-6 h-6 text-slate-900" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
                ASeptar
              </h3>
            </div>
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Herramienta de análisis de poker desarrollada para jugadores principiantes y serios que buscan mejorar su juego 
              a través de matemáticas precisas y análisis estadístico avanzado.
            </p>
            <div className="flex justify-center space-x-8 mt-8 text-slate-400">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4" />
                <span className="text-sm">Cálculos Precisos</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Análisis</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span className="text-sm">Decisiones Óptimas</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
