/** Estado global reativo da viagem ativa, rota, análise solar e recomendação de assentos. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { requireHub, type Place } from '../data/hubs';
import type { PresetTrip } from '../data/presetTrips';
import { analyzeTrip } from '../engine/exposureCalculator';
import { haversineKm, waypointPath } from '../engine/geodesic';
import { defaultPath, estimateDurationMinutes } from '../engine/routeDiscretizer';
import { recommendSeats } from '../engine/seatRecommender';
import { utcToZoned, zonedTimeToUtc } from '../engine/timezone';
import type {
  Coordinates,
  OptimizationMode,
  SeatPreferences,
  SeatRecommendation,
  TransportMode,
  TripAnalysisResult,
} from '../engine/types';
import { getRoute, type RouteResult } from '../services/routingService';
import { createTripId, getPreferences, savePreferences, type SavedTrip, type UserPreferences } from '../services/storageService';
import { dateKey, nowRounded, parseDateKey, parseTime } from '../utils/format';

export interface TripState {
  mode: TransportMode;
  origin: Place;
  destination: Place;
  /** Data local da origem YYYY-MM-DD. */
  date: string;
  /** Horário local da origem HH:MM. */
  time: string;
  durationMinutes: number;
  durationAuto: boolean;
  optimization: OptimizationMode;
  waypoints?: Coordinates[];
  presetId?: string;
}

export interface TripContextValue {
  trip: TripState;
  departure: Date;
  route: RouteResult | null;
  routeLoading: boolean;
  analysis: TripAnalysisResult;
  seats: SeatRecommendation;
  seatPrefs: SeatPreferences;
  preferences: UserPreferences;
  /** Duração sugerida pelo modal e pela distância. */
  suggestedDuration: number;
  setMode(mode: TransportMode): void;
  setOrigin(p: Place): void;
  setDestination(p: Place): void;
  swap(): void;
  setDate(date: string): void;
  setTime(time: string): void;
  setDuration(minutes: number): void;
  resetDurationAuto(): void;
  setOptimization(o: OptimizationMode): void;
  setSeatPrefs(p: SeatPreferences): void;
  applyPreset(p: PresetTrip): void;
  loadSaved(s: SavedTrip): void;
  toSavedTrip(name?: string): SavedTrip;
  updatePreferences(patch: Partial<UserPreferences>): void;
}

const TripContext = createContext<TripContextValue | null>(null);

function todayIn(tz: string): string {
  const p = utcToZoned(new Date(), tz);
  return dateKey(p.year, p.month, p.day);
}

function quickEstimate(origin: Place, destination: Place, mode: TransportMode): number {
  return estimateDurationMinutes(haversineKm(origin.coords, destination.coords), mode);
}

function initialState(): TripState {
  const origin = requireHub('rod-tiete');
  const destination = requireHub('rod-novo-rio');
  const now = nowRounded(origin.tz);
  return {
    mode: 'bus',
    origin,
    destination,
    date: now.date,
    time: now.time,
    durationMinutes: quickEstimate(origin, destination, 'bus'),
    durationAuto: true,
    optimization: 'shade',
  };
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<TripState>(initialState);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  // Incrementado a cada troca de rota para reaplicar a duração da rota real (em cache) mesmo sem mudança de chave.
  const [routeNonce, setRouteNonce] = useState(0);
  const [seatPrefs, setSeatPrefs] = useState<SeatPreferences>({});
  const [preferences, setPreferences] = useState<UserPreferences>({
    optimization: 'shade',
    seatPosition: 'any',
    seatZone: 'any',
    alertLeadMinutes: 5,
    useOnlineServices: true,
  });

  useEffect(() => {
    let alive = true;
    void getPreferences().then((p) => {
      if (!alive) return;
      setPreferences(p);
      setTrip((t) => ({ ...t, optimization: p.optimization }));
      setSeatPrefs({ position: p.seatPosition, zone: p.seatZone });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Busca a geometria real sempre que origem/destino/modal mudam.
  const routeKey = `${trip.mode}|${trip.origin.id}|${trip.destination.id}|${trip.waypoints?.length ?? 0}|${preferences.useOnlineServices}|${routeNonce}`;
  useEffect(() => {
    let alive = true;
    setRoute(null);
    setRouteLoading(true);
    void getRoute(trip.origin.coords, trip.destination.coords, trip.mode, {
      waypoints: trip.waypoints,
      online: preferences.useOnlineServices,
    })
      .then((r) => {
        if (!alive) return;
        setRoute(r);
        setTrip((t) => (t.durationAuto ? { ...t, durationMinutes: r.durationMinutes } : t));
      })
      .finally(() => {
        if (alive) setRouteLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [routeKey]);

  const departure = useMemo(() => {
    const { year, month, day } = parseDateKey(trip.date);
    const { hour, minute } = parseTime(trip.time);
    return zonedTimeToUtc(year, month, day, hour, minute, trip.origin.tz);
  }, [trip.date, trip.time, trip.origin.tz]);

  const path = useMemo<Coordinates[]>(() => {
    if (route) return route.path;
    if (trip.waypoints && trip.waypoints.length > 0)
      return waypointPath([trip.origin.coords, ...trip.waypoints, trip.destination.coords], 10);
    return defaultPath(trip.origin.coords, trip.destination.coords);
  }, [route, trip.waypoints, trip.origin.coords, trip.destination.coords]);

  const analysis = useMemo(
    () =>
      analyzeTrip({
        origin: trip.origin.coords,
        destination: trip.destination.coords,
        path,
        departure,
        durationMinutes: Math.max(5, trip.durationMinutes),
        mode: trip.mode,
        optimization: trip.optimization,
      }),
    [path, departure, trip.durationMinutes, trip.mode, trip.optimization, trip.origin.coords, trip.destination.coords],
  );

  const seats = useMemo(() => recommendSeats(analysis, trip.optimization, seatPrefs), [analysis, trip.optimization, seatPrefs]);

  const suggestedDuration = route?.durationMinutes ?? quickEstimate(trip.origin, trip.destination, trip.mode);

  const patch = useCallback((p: Partial<TripState>) => setTrip((t) => ({ ...t, ...p })), []);

  const setPlaces = useCallback((origin: Place, destination: Place, extra: Partial<TripState> = {}) => {
    setRouteNonce((n) => n + 1);
    // Mudar a rota sempre volta para a duração automática: estimativa imediata,
    // refinada quando a geometria real chegar (efeito de rota acima).
    setTrip((t) => {
      const mode = extra.mode ?? t.mode;
      return {
        ...t,
        origin,
        destination,
        waypoints: undefined,
        presetId: undefined,
        ...extra,
        durationAuto: true,
        durationMinutes: quickEstimate(origin, destination, mode),
      };
    });
  }, []);

  const value: TripContextValue = {
    trip,
    departure,
    route,
    routeLoading,
    analysis,
    seats,
    seatPrefs,
    preferences,
    suggestedDuration,
    setMode: (mode) => setPlaces(trip.origin, trip.destination, { mode }),
    setOrigin: (p) => setPlaces(p, trip.destination),
    setDestination: (p) => setPlaces(trip.origin, p),
    swap: () => {
      setRouteNonce((n) => n + 1);
      setTrip((t) => ({
        ...t,
        origin: t.destination,
        destination: t.origin,
        waypoints: t.waypoints ? [...t.waypoints].reverse() : undefined,
        presetId: undefined,
        durationAuto: true,
        durationMinutes: quickEstimate(t.destination, t.origin, t.mode),
      }));
    },
    setDate: (date) => patch({ date }),
    setTime: (time) => patch({ time }),
    setDuration: (minutes) => patch({ durationMinutes: Math.max(5, Math.min(24 * 60, Math.round(minutes))), durationAuto: false }),
    resetDurationAuto: () => patch({ durationAuto: true, durationMinutes: suggestedDuration }),
    setOptimization: (optimization) => patch({ optimization }),
    setSeatPrefs,
    applyPreset: (p) => {
      const origin = requireHub(p.originId);
      const destination = requireHub(p.destinationId);
      setTrip((t) => ({
        ...t,
        mode: p.mode,
        origin,
        destination,
        time: p.time,
        durationMinutes: p.durationMinutes,
        durationAuto: false,
        optimization: p.optimization,
        waypoints: p.waypoints,
        presetId: p.id,
        date: t.date < todayIn(origin.tz) ? todayIn(origin.tz) : t.date,
      }));
    },
    loadSaved: (s) =>
      setTrip({
        mode: s.mode,
        origin: s.origin,
        destination: s.destination,
        date: s.date,
        time: s.time,
        durationMinutes: s.durationMinutes,
        durationAuto: false,
        optimization: s.optimization,
        presetId: s.presetId,
        waypoints: undefined,
      }),
    toSavedTrip: (name) => ({
      id: createTripId(),
      name: name ?? `${trip.origin.city} → ${trip.destination.city}`,
      createdAt: new Date().toISOString(),
      mode: trip.mode,
      origin: trip.origin,
      destination: trip.destination,
      date: trip.date,
      time: trip.time,
      durationMinutes: trip.durationMinutes,
      optimization: trip.optimization,
      presetId: trip.presetId,
      summary: {
        recommendedSide: analysis.recommendedSide,
        advantagePct: analysis.advantagePct,
        verdict: analysis.verdict,
        bestSeat: seats.best.seat.label,
      },
    }),
    updatePreferences: (p) => {
      setPreferences((prev) => ({ ...prev, ...p }));
      void savePreferences(p);
    },
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip precisa estar dentro de <TripProvider>');
  return ctx;
}
