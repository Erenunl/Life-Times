import type { City } from "../types/game";

export const cities: City[] = [
  { id: "city-istanbul", name: "Istanbul", country: "Turkey" },
  { id: "city-izmir", name: "Izmir", country: "Turkey" },
  { id: "city-ankara", name: "Ankara", country: "Turkey" },
];

export function findCityById(cityId: string): City | undefined {
  return cities.find((city) => city.id === cityId);
}
