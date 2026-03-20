import json
import random
from collections import Counter

TIPUS_HABITATGE = [
    ("viu al carrer sense cap sostre", 5),
    ("dorm en un alberg o centre d'emergencia", 4),
    ("viu en una infrahabitatge en molt mal estat", 4),
    ("ocupa un habitatge sense contracte", 3),
    ("viu en un pis rellogat en condicions precaries", 3),
    ("te un pis de lloguer pero amb dificultats per pagar", 2),
    ("viu en un habitatge compartit amb altres families", 2),
    ("te habitatge propi pagat o en propietat", 0),
    ("viu amb familiars per no poder pagar el lloguer", 2),
    ("li han fet un desnonament recent", 5),
    ("esta en risc imminent de perdre el pis", 4),
]
SITUACIO_LABORAL = [
    ("esta a l'atur i no cobra cap prestacio", 4),
    ("esta a l'atur i cobra el subsidi", 2),
    ("treballa en negre sense contracte ni seguretat social", 3),
    ("te un contracte temporal i precari", 1),
    ("treballa a temps parcial amb ingressos insuficients", 2),
    ("te feina estable amb contracte indefinit", 0),
    ("es jubilat amb pensio minima", 2),
    ("es jubilat amb pensio suficient", 0),
    ("esta de baixa medica de llarga durada", 2),
    ("no pot treballar per cuidar fills o familiars", 2),
    ("mai ha treballat i no te experiencia laboral", 3),
    ("ha perdut la feina recentment per acomiadament", 3),
]
INGRESSOS = [
    ("no te absolutament cap ingres", 5),
    ("rep l'ingres minim vital de l'estat", 2),
    ("rep la renda garantida de ciutadania de la Generalitat", 2),
    ("rep una ajuda dels serveis socials municipals", 2),
    ("te ingressos irregulars i insuficients", 3),
    ("te ingressos suficients per cobrir les necessitats basiques", 0),
    ("rep una pensio de discapacitat no contributiva", 2),
    ("depen economicament de familiars", 2),
    ("te deutes importants amb bancs o creditors", 3),
    ("ha de pagar una hipoteca que no pot assumir", 3),
]
CIUTADANIA = [
    ("es indocumentat sense cap paper legal", 4),
    ("esta en situacio administrativa irregular", 3),
    ("te permis de residencia temporal en tramit", 2),
    ("te permis de residencia i treball temporal", 1),
    ("es refugiat amb proteccio internacional", 3),
    ("es ciutada comunitari europeu no espanyol", 1),
    ("es ciutada espanyol", 0),
    ("ha perdut els papers per caducitat", 3),
    ("es victima de trafic de persones", 5),
    ("te proteccio temporal per conflicte armat Ucraïna", 2),
]
SALUT = [
    ("te una malaltia cronica greu que li limita la vida", 4),
    ("pateix un trastorn de salut mental greu", 4),
    ("te una addiccio activa a l'alcohol o drogues", 3),
    ("te una discapacitat fisica reconeguda", 3),
    ("te problemes de salut mental en tractament", 2),
    ("esta en bon estat de salut general", 0),
    ("no te cobertura sanitaria per situacio irregular", 3),
    ("necessita medicacio cara que no pot pagar", 3),
    ("ha patit violencia de genere recentment", 4),
    ("te una malaltia lleu controlada amb medicacio", 1),
    ("es gran i te problemes de mobilitat", 2),
]
FAMILIA = [
    ("viu sol sense cap xarxa familiar de suport", 3),
    ("es cap d'una familia monoparental amb fills menors", 4),
    ("te una familia nombrosa amb mes de 3 fills", 3),
    ("viu en parella sense fills amb dificultats", 1),
    ("te fills a carrec amb necessitats especials", 4),
    ("te familiars malalts a carrec seu", 3),
    ("te xarxa familiar de suport parcial", 1),
    ("te bona xarxa familiar i de suport", 0),
    ("es menor d'edat no acompanyat", 5),
    ("es una persona gran que viu sola", 3),
]
MUNICIPIS = [
    "Tarragona", "Reus", "Cambrils", "Salou", "Vila-seca",
    "Torredembarra", "Valls", "El Vendrell", "Calafell",
    "Tortosa", "Amposta", "Gandesa", "Montblanc", "Falset",
    "Alcover", "la Selva del Camp", "Riudoms", "Constantí",
]
ORIGENS = [
    "d'origen marroqui", "d'origen senegalès", "d'origen romanès",
    "d'origen colombià", "d'origen hondureny", "d'origen ucraïnès",
    "d'origen gambià", "d'origen pakistanès", "nascut a Catalunya",
    "nascut a Andalusia", "nascut a Extremadura", "d'origen sirià",
    "d'origen malià", "nascut a les Illes Canàries",
]
EDATS = list(range(18, 85))
PLANTILLES = [
    "Persona de {edat} anys {origen} que viu a {mun}. {hab}. {lab}. {ing}. {fam}. {sal}.",
    "{edat} anys, {mun}. {fam}. {hab}. {lab}. {ing}. {sal}.",
    "Cas a {mun}: persona {origen} de {edat} anys. {hab}. {sal}. {lab}. {ing}. {fam}.",
    "S'aten una persona de {edat} anys a {mun}. {fam}. {sal}. {hab}. {ing}. {lab}.",
    "{edat} anys, {origen}, resident a {mun}. {hab}. {fam}. {lab}. {sal}. {ing}.",
    "Nou cas a Caritas {mun}. {edat} anys. {fam}. {hab}. {ing}. {lab}. {sal}.",
]

SCORE_RANGES = {
    "baixa":   (0, 3),
    "mitjana": (4, 7),
    "alta":    (8, 13),
    "critica": (14, 30),
}

def score_total(h, l, i, c, s, f, edat):
    total = h + l + i + c + s + f
    if edat > 75: total += 2
    if edat < 25: total += 1
    return total

def generar_cas_per_label(target_label):
    low, high = SCORE_RANGES[target_label]
    for _ in range(1000):
        hab, h_s = random.choice(TIPUS_HABITATGE)
        lab, l_s = random.choice(SITUACIO_LABORAL)
        ing, i_s = random.choice(INGRESSOS)
        ciu, c_s = random.choice(CIUTADANIA)
        sal, s_s = random.choice(SALUT)
        fam, f_s = random.choice(FAMILIA)
        edat      = random.choice(EDATS)
        total     = score_total(h_s, l_s, i_s, c_s, s_s, f_s, edat)
        if low <= total <= high:
            municipi  = random.choice(MUNICIPIS)
            origen    = random.choice(ORIGENS)
            plantilla = random.choice(PLANTILLES)
            text = plantilla.format(
                edat=edat, origen=origen, mun=municipi,
                hab=hab, lab=lab, ing=ing, fam=fam, sal=sal
            )
            return {"text": text, "label": target_label}
    return None

random.seed(42)
N_PER_CLASS = 10000
casos = []

for label in ["baixa", "mitjana", "alta", "critica"]:
    print(f"Generant {N_PER_CLASS} casos '{label}'...")
    count = 0
    while count < N_PER_CLASS:
        cas = generar_cas_per_label(label)
        if cas:
            casos.append(cas)
            count += 1

random.shuffle(casos)

dist = Counter(c["label"] for c in casos)
print(f"\nTotal: {len(casos)} casos balancejats")
for k, v in sorted(dist.items()):
    print(f"  {k}: {v} casos ({v/len(casos)*100:.1f}%)")

with open("training_data.json", "w", encoding="utf-8") as f:
    json.dump(casos, f, ensure_ascii=False, indent=2)

print("\nDesat a training_data.json")
