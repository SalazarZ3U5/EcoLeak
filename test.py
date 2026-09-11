import pandas as pd
import chromadb

# Load local dataset tables
# Load local dataset tables (tab-separated files)
df_factors = pd.read_csv("data/emission_factors.csv", sep=r"\s+|\t", engine="python")
df_circular = pd.read_csv("data/circular_interventions.csv", sep=r"\s+|\t", engine="python")

# Initialize local ChromaDB vector store for circular intervention lookup
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="circular_interventions")

# Populate vector store with circular alternatives
for idx, row in df_circular.iterrows():
    collection.add(
        documents=[f"Alternative for {row['virgin_material_key']}: Use {row['circular_alternative_key']}."],
        metadatas=[{"virgin": row['virgin_material_key'], "alt": row['circular_alternative_key']}],
        ids=[f"id_{idx}"]
    )

print("Local vector store and lookup tables initialized successfully!")