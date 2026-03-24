export type OdaAfstemning = {
  readonly id: number
  readonly nummer: number
  readonly konklusion: string
  readonly vedtaget: boolean
  readonly kommentar: string | null
  readonly mødeid: number
  readonly typeid: number
  readonly sagstrinid: number | null
  readonly opdateringsdato: string
}

export type OdaSagstrin = {
  readonly id: number
  readonly titel: string
  readonly dato: string
  readonly sagid: number
  readonly typeid: number
  readonly statusid: number
  readonly opdateringsdato: string
}

export type OdaSag = {
  readonly id: number
  readonly typeid: number
  readonly titel: string
  readonly titelkort: string
  readonly resume: string | null
  readonly nummer: string
  readonly nummerprefix: string
  readonly nummernumerisk: number
  readonly periodeid: number
  readonly lovnummer: string | null
  readonly lovnummerdato: string | null
  readonly afstemningskonklusion: string | null
  readonly opdateringsdato: string
}

export type OdaPeriode = {
  readonly id: number
  readonly kode: string
  readonly titel: string
  readonly startdato: string
  readonly slutdato: string | null
  readonly opdateringsdato: string
}

export type OdaStemme = {
  readonly id: number
  readonly typeid: number
  readonly afstemningid: number
  readonly aktørid: number
  readonly opdateringsdato: string
  readonly Aktør?: OdaAktør
}

export type OdaAktør = {
  readonly id: number
  readonly typeid: number
  readonly navn: string
  readonly fornavn: string | null
  readonly efternavn: string | null
  readonly biografi: string | null
  readonly opdateringsdato: string
}

export type OdaResponse<T> = {
  readonly "odata.metadata": string
  readonly value: readonly T[]
}

export type OdaStemmetype = {
  readonly id: number
  readonly type: string
  readonly opdateringsdato: string
}

export type OdaAfstemningstype = {
  readonly id: number
  readonly type: string
  readonly opdateringsdato: string
}
