import sqlite3
import hashlib
import uuid
from datetime import datetime

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

conn = sqlite3.connect("trazaalimento.db")
cursor = conn.cursor()

# ── Borrar todas las tablas ──────────────────────────────────────────────────
print("Borrando tablas existentes...")
cursor.executescript("""
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS insumos_aplicados;
    DROP TABLE IF EXISTS alertas_lote;
    DROP TABLE IF EXISTS alertas_sanitarias;
    DROP TABLE IF EXISTS lotes;
    DROP TABLE IF EXISTS cooperativas;
    DROP TABLE IF EXISTS usuarios;
    PRAGMA foreign_keys = ON;
""")
print("✓ Tablas borradas")

# ── Crear tablas limpias ─────────────────────────────────────────────────────
cursor.executescript("""
    CREATE TABLE cooperativas (
        id               TEXT PRIMARY KEY,
        nombre           TEXT NOT NULL,
        municipio        TEXT NOT NULL,
        producto_principal TEXT,
        contacto_email   TEXT,
        created_at       TEXT NOT NULL
    );

    CREATE TABLE usuarios (
        id               TEXT PRIMARY KEY,
        email            TEXT UNIQUE NOT NULL,
        password_hash    TEXT NOT NULL,
        nombre           TEXT NOT NULL,
        telefono         TEXT,
        rol              TEXT NOT NULL,
        cooperativa_id   TEXT REFERENCES cooperativas(id),
        activo           INTEGER DEFAULT 1,
        created_at       TEXT NOT NULL
    );

    CREATE TABLE lotes (
        id               TEXT PRIMARY KEY,
        cooperativa_id   TEXT REFERENCES cooperativas(id),
        registrado_por   TEXT REFERENCES usuarios(id),
        cultivo          TEXT NOT NULL,
        parcela          TEXT,
        fecha_siembra    TEXT,
        fecha_cosecha    TEXT NOT NULL,
        almacenamiento   TEXT,
        estado           TEXT NOT NULL,
        created_at       TEXT NOT NULL
    );

    CREATE TABLE insumos_aplicados (
        id               TEXT PRIMARY KEY,
        lote_id          TEXT NOT NULL REFERENCES lotes(id),
        nombre           TEXT NOT NULL,
        dosis            REAL NOT NULL,
        fecha_aplicacion TEXT NOT NULL
    );

    CREATE TABLE alertas_sanitarias (
        id                    TEXT PRIMARY KEY,
        zona                  TEXT NOT NULL,
        tipo_patron           TEXT NOT NULL,
        lotes_involucrados    TEXT NOT NULL,
        insumo_recurrente     TEXT,
        periodo_analizado_dias INTEGER NOT NULL,
        nivel                 TEXT NOT NULL,
        recomendacion_automatica TEXT,
        estado                TEXT DEFAULT 'activa',
        created_at            TEXT NOT NULL
    );
""")
print("✓ Tablas creadas")

# ── Cooperativas ─────────────────────────────────────────────────────────────
now = datetime.now().isoformat()

coop_ids = {
    "sanjulian": str(uuid.uuid4()),
    "montero":   str(uuid.uuid4()),
    "warnes":    str(uuid.uuid4()),
}

cursor.executemany("""
    INSERT INTO cooperativas (id, nombre, municipio, producto_principal, contacto_email, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
""", [
    (coop_ids["sanjulian"], "Cooperativa Hortícola San Julián",
     "San Julián", "Tomate", "sjulian@trazaalimento.bo", now),
    (coop_ids["montero"], "Asociación de Productores Montero",
     "Montero", "Lechuga", "montero@trazaalimento.bo", now),
    (coop_ids["warnes"], "Cooperativa Agroecológica Warnes",
     "Warnes", "Frutilla", "warnes@trazaalimento.bo", now),
])
print("✓ Cooperativas insertadas")

# ── Usuarios ─────────────────────────────────────────────────────────────────
# IDs de productores (los necesitamos para vincular los lotes)
prod_ids = {
    "carlos":  str(uuid.uuid4()),
    "rosa":    str(uuid.uuid4()),
    "juan":    str(uuid.uuid4()),
    "maria":   str(uuid.uuid4()),
    "pedro":   str(uuid.uuid4()),
    "lucia":   str(uuid.uuid4()),
}

# IDs de compradores
comp_ids = {
    "ketal":    str(uuid.uuid4()),
    "comedor":  str(uuid.uuid4()),
    "hospital": str(uuid.uuid4()),
}

usuarios = [
    # ── Productores ──────────────────────────────────────────────────────────
    # San Julián (2 productores)
    (prod_ids["carlos"], "carlos@sanjulian.bo",
     hash_password("productor123"),
     "Carlos Mamani", "76511111",
     "productor", coop_ids["sanjulian"], 1, now),

    (prod_ids["rosa"], "rosa@sanjulian.bo",
     hash_password("productor123"),
     "Rosa Flores", "76511112",
     "productor", coop_ids["sanjulian"], 1, now),

    # Montero (2 productores)
    (prod_ids["juan"], "juan@montero.bo",
     hash_password("productor123"),
     "Juan Torrez", "76522221",
     "productor", coop_ids["montero"], 1, now),

    (prod_ids["lucia"], "lucia@montero.bo",
     hash_password("productor123"),
     "Lucía Pérez", "76522222",
     "productor", coop_ids["montero"], 1, now),

    # Warnes (2 productores)
    (prod_ids["maria"], "maria@warnes.bo",
     hash_password("productor123"),
     "María Condori", "76533331",
     "productor", coop_ids["warnes"], 1, now),

    (prod_ids["pedro"], "pedro@warnes.bo",
     hash_password("productor123"),
     "Pedro Quispe", "76533332",
     "productor", coop_ids["warnes"], 1, now),

    # ── Compradores ──────────────────────────────────────────────────────────
    (comp_ids["ketal"], "compras@ketal.bo",
     hash_password("comprador123"),
     "Supermercado Ketal SCZ", "76544441",
     "comprador", None, 1, now),

    (comp_ids["comedor"], "compras@comedor.bo",
     hash_password("comprador123"),
     "Comedor Escolar Unidad 1", "76544442",
     "comprador", None, 1, now),

    (comp_ids["hospital"], "compras@hospitalscz.bo",
     hash_password("comprador123"),
     "Hospital Municipal Santa Cruz", "76544443",
     "comprador", None, 1, now),
]

cursor.executemany("""
    INSERT INTO usuarios
    (id, email, password_hash, nombre, telefono, rol, cooperativa_id, activo, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
""", usuarios)
print("✓ Usuarios insertados")

# ── Lotes ─────────────────────────────────────────────────────────────────────
lote_ids = [str(uuid.uuid4()) for _ in range(8)]

lotes = [
    # San Julián — Carlos — APTO
    (lote_ids[0], coop_ids["sanjulian"], prod_ids["carlos"],
     "Tomate", "Parcela Norte A-01",
     "2026-03-01", "2026-06-15",
     "Cámara fría a 12°C, humedad 85%",
     "APTO", now),

    # San Julián — Carlos — OBSERVADO
    (lote_ids[1], coop_ids["sanjulian"], prod_ids["carlos"],
     "Pimiento", "Parcela Norte A-02",
     "2026-03-05", "2026-06-20",
     "Galpón techado, ventilación cruzada",
     "OBSERVADO", now),

    # San Julián — Rosa — NO APTO
    (lote_ids[2], coop_ids["sanjulian"], prod_ids["rosa"],
     "Tomate", "Parcela Norte B-01",
     "2026-03-10", "2026-06-18",
     "Almacén sin refrigeración",
     "NO APTO", now),

    # San Julián — Rosa — APTO
    (lote_ids[3], coop_ids["sanjulian"], prod_ids["rosa"],
     "Pepino", "Parcela Norte B-02",
     "2026-03-12", "2026-06-25",
     "Cámara fría a 10°C, humedad 80%",
     "APTO", now),

    # Montero — Juan — APTO
    (lote_ids[4], coop_ids["montero"], prod_ids["juan"],
     "Lechuga", "Parcela Sur C-01",
     "2026-04-01", "2026-06-25",
     "Cámara fría a 8°C, humedad 90%",
     "APTO", now),

    # Montero — Lucía — APTO
    (lote_ids[5], coop_ids["montero"], prod_ids["lucia"],
     "Zanahoria", "Parcela Sur C-02",
     "2026-03-15", "2026-07-01",
     "Galpón techado a temperatura ambiente",
     "APTO", now),

    # Warnes — María — OBSERVADO
    (lote_ids[6], coop_ids["warnes"], prod_ids["maria"],
     "Frutilla", "Parcela Este D-01",
     "2026-04-10", "2026-06-30",
     "Cámara fría a 5°C, embalaje en cajas",
     "OBSERVADO", now),

    # Warnes — Pedro — APTO
    (lote_ids[7], coop_ids["warnes"], prod_ids["pedro"],
     "Melón", "Parcela Este D-02",
     "2026-04-05", "2026-07-10",
     "Galpón ventilado, temperatura ambiente",
     "APTO", now),
]

cursor.executemany("""
    INSERT INTO lotes
    (id, cooperativa_id, registrado_por, cultivo, parcela,
     fecha_siembra, fecha_cosecha, almacenamiento, estado, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", lotes)
print("✓ Lotes insertados")

# ── Insumos aplicados ─────────────────────────────────────────────────────────
insumos = [
    # Lote 0 — Tomate APTO
    (str(uuid.uuid4()), lote_ids[0], "Decis",    0.5, "2026-06-10"),
    (str(uuid.uuid4()), lote_ids[0], "Mancozeb", 2.0, "2026-05-20"),
    # Lote 1 — Pimiento OBSERVADO
    (str(uuid.uuid4()), lote_ids[1], "Lorsban",  1.5, "2026-06-12"),
    # Lote 2 — Tomate NO APTO
    (str(uuid.uuid4()), lote_ids[2], "Lorsban",  3.5, "2026-05-28"),
    # Lote 3 — Pepino APTO
    (str(uuid.uuid4()), lote_ids[3], "Decis",    0.3, "2026-05-15"),
    # Lote 4 — Lechuga APTO
    (str(uuid.uuid4()), lote_ids[4], "Mancozeb", 1.5, "2026-05-10"),
    # Lote 5 — Zanahoria APTO
    (str(uuid.uuid4()), lote_ids[5], "Decis",    0.4, "2026-05-01"),
    # Lote 6 — Frutilla OBSERVADO
    (str(uuid.uuid4()), lote_ids[6], "Karate",   0.8, "2026-06-20"),
    # Lote 7 — Melón APTO
    (str(uuid.uuid4()), lote_ids[7], "Mancozeb", 1.0, "2026-05-20"),
]

cursor.executemany("""
    INSERT INTO insumos_aplicados (id, lote_id, nombre, dosis, fecha_aplicacion)
    VALUES (?, ?, ?, ?, ?)
""", insumos)
print("✓ Insumos insertados")

# ── Alertas sanitarias ────────────────────────────────────────────────────────
alertas = [
    (str(uuid.uuid4()), "San Julián", "concentracion_geografica",
     f'["{lote_ids[1]}", "{lote_ids[2]}"]',
     "Lorsban", 30, "preventiva",
     "Se detectaron 2 lotes con carencia insuficiente de Lorsban en San Julián. "
     "Revisar lotes activos y suspender cosechas hasta verificar períodos.",
     "activa", now),

    (str(uuid.uuid4()), "Montero", "tasa_rechazo",
     "[]", None, 30, "informativa",
     "Tasa de aprobación en Montero superior al 90%. Sin observaciones.",
     "resuelta", now),
]

cursor.executemany("""
    INSERT INTO alertas_sanitarias
    (id, zona, tipo_patron, lotes_involucrados, insumo_recurrente,
     periodo_analizado_dias, nivel, recomendacion_automatica, estado, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", alertas)
print("✓ Alertas sanitarias insertadas")

conn.commit()

# ── Resumen ───────────────────────────────────────────────────────────────────
print("\n════════════════════════════════════════")
print("  BASE DE DATOS LISTA")
print("════════════════════════════════════════")

cursor.execute("SELECT COUNT(*) FROM cooperativas")
print(f"  Cooperativas:        {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM usuarios WHERE rol='productor'")
print(f"  Productores:         {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM usuarios WHERE rol='comprador'")
print(f"  Compradores:         {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM lotes")
print(f"  Lotes:               {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM insumos_aplicados")
print(f"  Insumos aplicados:   {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM alertas_sanitarias")
print(f"  Alertas sanitarias:  {cursor.fetchone()[0]}")

print("\n── Credenciales ─────────────────────────────────────────────────")
print("  ROL PRODUCTOR")
print("  carlos@sanjulian.bo      → productor123  (San Julián)")
print("  rosa@sanjulian.bo        → productor123  (San Julián)")
print("  juan@montero.bo          → productor123  (Montero)")
print("  lucia@montero.bo         → productor123  (Montero)")
print("  maria@warnes.bo          → productor123  (Warnes)")
print("  pedro@warnes.bo          → productor123  (Warnes)")
print("\n  ROL COMPRADOR")
print("  compras@ketal.bo         → comprador123  (Supermercado Ketal)")
print("  compras@comedor.bo       → comprador123  (Comedor Escolar)")
print("  compras@hospitalscz.bo   → comprador123  (Hospital Municipal)")

conn.close()