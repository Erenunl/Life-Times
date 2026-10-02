import type { City } from "../types/game";

export const cities: City[] = [
  { id: "city-istanbul", name: "İstanbul", country: "Türkiye" },
  { id: "city-izmir", name: "İzmir", country: "Türkiye" },
  { id: "city-ankara", name: "Ankara", country: "Türkiye" },
];

export function findCityById(cityId: string): City | undefined {
  return cities.find((city) => city.id === cityId);
}
