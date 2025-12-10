from fastapi import File, UploadFile
from fastapi.responses import JSONResponse
import os
from fastapi import FastAPI, Form
import uuid
from fastapi import Query
from pubmed_article_type import pubmed_filtered_count
from mesh_terms import get_mesh_terms
from refined_prompt_focus import *
from pubmed_extraction_new import *
from science_direct_new import *
from tandfonline_new import *
from wiley_online_library_new import *
from doc_to_docx import *
from prompt_additional_keywords import *
from itertools import zip_longest
from pubmed_author_search import *
import datetime
from pubmed_coauthour import *
from author_aff_prompt import *
from pubmed_author_email_aff import *
from aff_country_extraction import *
from same_country import *
from pubmed_clinical_trail import *
from city_extract import *
from country_extract import *
from tandfonline_author_pub_last_year import *
from pubmed_no_english_pub import *
import logging
from logging.handlers import RotatingFileHandler

# Create logs directory
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Configure logger
logger = logging.getLogger("scholarfinder_logger")
logger.setLevel(logging.DEBUG)  # Log everything >= DEBUG

# Log to a rotating file (max 5MB per file, keep 5 backups)
file_handler = RotatingFileHandler(LOG_DIR + "/scholarfinder.log", maxBytes=5*1024*1024, backupCount=5)
formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# Optional: also log to console
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# Directories
UPLOAD_DIR = "API_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
BASE_DIR = Path("API_uploads")

app = FastAPI(title="ScholarFinder APIs")

# Add CORS middleware to allow frontend requests
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


# -----------------------------------------------------------
# 1️⃣ UPLOAD + EXTRACT METADATA
# -----------------------------------------------------------
@app.post("/upload_extract_metadata")
async def upload_extract_metadata(file: UploadFile = File(...)):
    """
    Upload a Word (.doc/.docx) file and extract metadata (heading, authors, affiliations, keywords, abstract).
    """
    # Generate unique job directory
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M')}_{uuid.uuid4().hex[:6]}"
    job_dir = BASE_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # print("\nupload_extract_metadata started...")
    # print(f"Job ID : {job_id}")
    logger.info("\n--------------------------------------------------------------------------------")
    logger.info(f"\nJob ID: {job_id}")
    logger.info("upload_extract_metadata started")

    # Save uploaded file
    save_path = job_dir / file.filename
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    # print(f"Uploaded file saved at: {save_path}")
    logger.info(f"Uploaded file saved at: {save_path}")

    full_file_path = os.path.abspath(save_path)

    # Convert .doc → .docx if needed
    if save_path.suffix.lower() == ".doc":
        output_path = convert_doc_to_docx(full_file_path)
        # print(f"Converted .doc to .docx at: {output_path}")
        logger.info(f"Converted .doc to .docx at: {output_path}")
    else:
        output_path = save_path
        # print(f"No conversion needed, using file: {output_path}")
        logger.info(f"No conversion needed, using file: {output_path}")

    trim_path, marker_found = trim_docx_copy(output_path)
    logger.info(f"Marker: {marker_found}")
    logger.info(f"Trimmed docx at: {trim_path}")

    txt_file, manuscript_text = docx_to_text(trim_path)
    logger.info(f"Converted DOCX to TXT: {txt_file}")

    # metadata = claude_extract_manuscript_metadata(manuscript_text)
    metadata, heading, authors, affiliations, keywords, abstract, author_aff_map = claude_extract_manuscript_metadata(manuscript_text)

    # print("\n--- Extracted Metadata ---")
    # print(json.dumps(metadata, indent=4))
    logger.info(f"Manuscript metadata: {metadata}")
    # print("\nTitle:", heading)
    logger.info(f"Heading: {heading}")
    # print("Authors:", authors)
    logger.info(f"Authors: {authors}")
    # print("Affiliations:", affiliations)
    logger.info(f"Affiliations: {affiliations}")
    # print("Keywords:", keywords)
    logger.info(f"Keywords: {keywords}")
    # print("Abstract:", abstract)
    logger.info(f"Abstract: {abstract}")
    logger.info(f"Abstract length: {len(abstract)} characters")
    # print("Author-Affiliation Map:", json.dumps(author_aff_map, indent=4))
    logger.info(f"Author-Affiliation Map: {author_aff_map}")

    result = {
        "job_id": job_id,
        "file_name": file.filename,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "heading": heading,
        "authors": authors,
        "affiliations": affiliations,
        "keywords": keywords,
        "abstract": abstract,
        "author_aff_map": author_aff_map
    }
    metadata_filename = f"{Path(file.filename).stem}_metadata.json"
    metadata_path = job_dir / metadata_filename

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    # print(f"Metadata saved at: {metadata_path}")
    logger.info(f"Metadata saved at: {metadata_path}\n")

    return JSONResponse(content={
        "message": "Metadata extracted successfully.",
        "data": result
    })


# -----------------------------------------------------------
# 2️⃣ VIEW CURRENT METADATA
# -----------------------------------------------------------
@app.get("/metadata_extraction")
def metadata_extraction(job_id: str = Query(..., description="Unique job ID from upload_extract_metadata")):
    """
    Display the extracted metadata for a given job_id.
    """

    job_dir = BASE_DIR / job_id
    if not job_dir.exists():
        # print(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        logger.error(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        return JSONResponse(
            content={"error": f"Invalid job_id '{job_id}'. Please check or re-upload your file."},
            status_code=404
        )

    # print(f"\nFetching metadata for job_id: {job_id}")
    logger.info("Metadata extraction")
    logger.info(f"Fetching metadata for job_id: {job_id}")

    # Prefer *_keywords.json if available, otherwise *_metadata.json
    metadata_files = list(job_dir.glob("*_keywords.json")) or list(job_dir.glob("*_metadata.json"))
    if not metadata_files:
        # print(f"No metadata found for job_id '{job_id}'.")
        logger.warning(f"No metadata found for job_id '{job_id}'.")
        return JSONResponse(
            content={"error": f"No metadata found for job_id '{job_id}'."},
            status_code=404
        )

    metadata_path = metadata_files[0]
    # print(f"Metadata file found: {metadata_path.name}")
    logger.info(f"Metadata file found: {metadata_path.name}")

    with open(metadata_path, "r", encoding="utf-8") as f:
        metadata_result = json.load(f)

    # print(f"Metadata loaded successfully for job_id: {job_id}")
    logger.info(f"Metadata loaded successfully for job_id: {job_id}\n")

    return JSONResponse(content={
        "job_id": job_id,
        "file_name": metadata_path.name,
        "data": metadata_result
    })


# -----------------------------------------------------------
# 3️⃣ EXTEND METADATA — MeSH, Focus, Keywords
# -----------------------------------------------------------
@app.post("/keyword_enhancement")
def keyword_enhancement(job_id: str = Query(..., description="Unique job ID from upload_extract_metadata")):
    job_dir = BASE_DIR / job_id
    if not job_dir.exists():
        # print(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        logger.error(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        return JSONResponse(
            content={"error": f"Invalid job_id '{job_id}'. Please upload and extract metadata first."},
            status_code=404
        )

    # 🔍 Find any *_metadata.json file
    metadata_files = list(job_dir.glob("*_metadata.json"))
    if not metadata_files:
        # print(f"No base metadata found for job_id '{job_id}'.")
        logger.warning(f"No base metadata found for job_id '{job_id}'.")
        return JSONResponse(
            content={"error": "No base metadata found in folder. Please run /upload_extract_metadata first."},
            status_code=404
        )

    # Pick the first metadata file
    metadata_path = metadata_files[0]
    base_name = metadata_path.stem.replace("_metadata", "")
    focus_path = job_dir / f"{base_name}_focus_keywords.json"

    # print("\nkeyword_enhancement started...")
    logger.info(f"keyword_enhancement started for job_id: {job_id}")

    # Load metadata
    with open(metadata_path, "r", encoding="utf-8") as f:
        input_data = json.load(f)
    # print(f"Loaded metadata file: {metadata_path.name}")
    logger.info(f"Loaded metadata file: {metadata_path.name}")

    extracted_heading = input_data.get("heading", "")
    extracted_abstract = input_data.get("abstract", "")
    extracted_keywords = input_data.get("keywords", "")

    # Step 1: Get MeSH terms
    mesh_terms, broader_terms = get_mesh_terms(extracted_heading)
    # print("\nMesh terms:\n ", mesh_terms)
    # print("\nBroader terms:\n ", broader_terms)
    logger.info(f"Mesh terms: {mesh_terms}, Broader terms: {broader_terms}")

    # Step 2: Get primary/secondary focus from Claude
    primary_secondary = primary_sec(extracted_heading, extracted_abstract, extracted_keywords, mesh_terms)
    # print("\nPrimary and secondary focus from claude:\n", primary_secondary)
    logger.info("Primary and secondary focus received from Claude")

    json_match = re.search(r'\{.*?\}', primary_secondary, re.DOTALL)
    if json_match:
        json_text = json_match.group()
        data = json.loads(json_text)
        logger.info("Successfully parsed JSON from Claude output")
    else:
        logger.error("JSON object not found in Claude output")
        raise ValueError("JSON object not found in the text.")

    # Existing smart_split and keyword processing code
    def smart_split(focus_str):
        focus_str = focus_str.strip()
        if focus_str.startswith("(") and focus_str.endswith(")"):
            focus_str = focus_str[1:-1].strip()
        pattern = r'\s+(?=OR|AND)(?![^()]*\))\s+'
        return [x.strip() for x in re.split(pattern, focus_str)]

    primary_focus = smart_split(data["primary focus"])
    secondary_focus = smart_split(data["secondary focus"])
    # print("\nPrimary focus: \n", primary_focus)
    # print('\nSecondary focus: \n', secondary_focus)
    logger.info(f"Primary focus: {primary_focus}, Secondary focus: {secondary_focus}")

    primary_focus_string = primary_focus[0].replace(" OR ", ", ")
    secondary_focus_string = secondary_focus[0].replace(" OR ", ", ")
    # print("\nPrimary focus string: \n", primary_focus_string)
    # print('\nSecondary focus string: \n', secondary_focus_string)
    logger.info(f"Primary string: {primary_focus_string} and secondary focus string: {secondary_focus_string}")

    add_keywords_output = additional_keywords(
        extracted_heading, extracted_abstract, extracted_keywords,
        mesh_terms, primary_focus_string, secondary_focus_string
    )
    # print("\nAdditional keywords output: \n", add_keywords_output)
    logger.info(f"Additional keywords: {add_keywords_output}")

    # Parse additional keywords JSON
    json_match = re.search(r'\{.*?\}', add_keywords_output, re.DOTALL)
    if json_match:
        json_text = json_match.group()
        data = json.loads(json_text)
        logger.info("Parsed additional keywords JSON successfully")
    else:
        logger.error("JSON object not found in additional keywords output")
        raise ValueError("JSON object not found in the text.")

    # Extract additional keywords
    if data:
        additional_primary_keywords = data.get("additional_primary_keywords") or []
        additional_secondary_keywords = data.get("additional_secondary_keywords") or []
    else:
        additional_primary_keywords = []
        additional_secondary_keywords = []

    # print("\nAdditional primary keywords: \n", additional_primary_keywords)
    # print("\nAdditional secondary keywords: \n", additional_secondary_keywords)
    logger.info(f"Additional primary keywords: {additional_primary_keywords}")
    logger.info(f"Additional secondary keywords: {additional_secondary_keywords}")

    additional_primary_keywords_string = ", ".join(additional_primary_keywords)
    additional_secondary_keywords_string = ", ".join(additional_secondary_keywords)

    # print("\nAdditional primary keywords string:\n", additional_primary_keywords_string)
    # print("\nAdditional secondary keywords string:\n", additional_secondary_keywords_string)
    logger.info(f"Additional primary keywords string: {additional_primary_keywords_string}")
    logger.info(f"Additional secondary keywords string: {additional_secondary_keywords_string}")

    all_primary_focus_string = primary_focus_string + ", " + additional_primary_keywords_string
    all_secondary_focus_string = secondary_focus_string + ", " + additional_secondary_keywords_string
    # print("\nAll primary focus keywords:\n", all_primary_focus_string)
    logger.info(f"All primary focus keywords: {all_primary_focus_string}")
    # print("\nAll secondary focus keywords:\n", all_secondary_focus_string)
    logger.info(f"All secondary focus keywords: {all_secondary_focus_string}")

    all_primary_focus_list = [s.strip() for s in all_primary_focus_string.split(",")]
    all_secondary_focus_list = [s.strip() for s in all_secondary_focus_string.split(",")]
    # print("\nAll primary focus keywords list:\n", all_primary_focus_list)
    logger.info(f"All primary focus keywords list: {all_primary_focus_list}")
    logger.info(f"All secondary focus keywords list:\n", all_secondary_focus_list)
    # print("\nAll secondary focus keywords list:\n", all_secondary_focus_list)

    all_data = list(zip_longest(all_primary_focus_list, all_secondary_focus_list))
    all_df = pd.DataFrame(all_data, columns=['Primary keywords', 'Secondary keywords']).fillna("")
    all_df.to_csv(job_dir / "keywords.csv", index=False)
    logger.info("Saved keywords.csv")
    extended_json = input_data.copy()
    extended_json.update({
        "mesh_terms": mesh_terms,
        "broader_terms": broader_terms,
        "primary_focus": primary_focus,
        "secondary_focus": secondary_focus,
        "additional_primary_keywords": additional_primary_keywords,
        "additional_secondary_keywords": additional_secondary_keywords,
        "all_primary_focus_list": all_primary_focus_list,
        "all_secondary_focus_list": all_secondary_focus_list
    })

    # Save metadata and focus files
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(extended_json, f, indent=2, ensure_ascii=False)
    logger.info(f"Metadata saved: {metadata_path.name}")

    focus_json = {
        "job_id": job_id,
        "file_name": focus_path.name,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "mesh_terms": mesh_terms,
        "broader_terms": broader_terms,
        "primary_focus": primary_focus,
        "secondary_focus": secondary_focus,
        "additional_primary_keywords": additional_primary_keywords,
        "additional_secondary_keywords": additional_secondary_keywords
    }

    with open(focus_path, "w", encoding="utf-8") as f:
        json.dump(focus_json, f, indent=2, ensure_ascii=False)
    logger.info(f"Focus keywords saved: {focus_path.name}\n")

    return JSONResponse(content={
        "message": f"Keyword enhancement completed successfully for {base_name}.",
        "job_id": job_id,
        "metadata_file": metadata_path.name,
        "focus_file": focus_path.name,
        "data": extended_json
    })


# -----------------------------------------------------------
# 3️⃣ CREATE KEYWORD STRING
# -----------------------------------------------------------
@app.post("/keyword_string_generator")
def keyword_string_generator(
        job_id: str = Query(..., description="Unique job ID folder name created during upload_extract_metadata"),
        primary_keywords_input: str = Form(...),
        secondary_keywords_input: str = Form(...)
):
    """
    Combine primary and secondary keywords into a single keyword string
    using (kw1 OR kw2) AND (kw3 OR kw4) logic.
    Works within the job directory using job_id.
    """

    job_dir = BASE_DIR / job_id
    if not job_dir.exists():
        # print(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        logger.error(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        return JSONResponse(
            content={"error": f"Invalid job_id '{job_id}'. Please upload and extract metadata first."},
            status_code=404
        )

    # 🔍 find metadata file
    metadata_files = list(job_dir.glob("*_metadata.json"))
    if not metadata_files:
        # print(f"No metadata file found for job_id '{job_id}'.")
        logger.warning(f"No metadata file found for job_id '{job_id}'.")
        return JSONResponse(
            content={"error": "No metadata file found. Please run /upload_extract_metadata first."},
            status_code=404
        )

    # print("\nkeyword_string_generator started...")
    logger.info(f"keyword_string_generator started for job_id: {job_id}")

    metadata_path = metadata_files[0]
    base_name = metadata_path.stem.replace("_metadata", "")
    keyword_string_path = job_dir / f"{base_name}_keywordstring.json"
    logger.info(f"Metadata file: {metadata_path.name}, Keyword string file: {keyword_string_path.name}")

    # Read base metadata
    with open(metadata_path, "r", encoding="utf-8") as f:
        input_data = json.load(f)
    logger.info("Loaded metadata for keyword string generation")

    # Split and clean inputs
    primary_keywords = [kw.strip() for kw in primary_keywords_input.split(',') if kw.strip()]
    secondary_keywords = [kw.strip() for kw in secondary_keywords_input.split(',') if kw.strip()]
    logger.info(f"Primary keywords input: {primary_keywords}")
    logger.info(f"Secondary keywords input: {secondary_keywords}")

    # Function to make keyword group strings
    def build_string(keywords):
        kws = [kw for kw in keywords if kw]
        if not kws:
            return ""
        if len(kws) == 1:
            return f"({kws[0]})"
        return f"({' OR '.join(kws)})"

    primary_str = build_string(primary_keywords)
    secondary_str = build_string(secondary_keywords)

    # Combine logically
    if primary_str and secondary_str:
        keyword_string = f"{primary_str} AND {secondary_str}"
    else:
        keyword_string = primary_str or secondary_str

    # print("\nkeyword string:\n", keyword_string)
    logger.info(f"Generated keyword string: {keyword_string}")

    # Prepare data to save
    keyword_string_json = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "input_primary_keywords": primary_keywords,
        "input_secondary_keywords": secondary_keywords,
        "keyword_string": keyword_string
    }

    # Save as separate file
    with open(keyword_string_path, "w", encoding="utf-8") as f:
        json.dump(keyword_string_json, f, indent=2, ensure_ascii=False)
    logger.info(f"Keyword string saved to file: {keyword_string_path.name}")

    # Update metadata as well
    updated_data = input_data.copy()
    updated_data.update(keyword_string_json)

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(updated_data, f, indent=2, ensure_ascii=False)
    logger.info(f"Metadata updated with keyword string: {metadata_path.name}\n")

    return JSONResponse(content={
        "message": f"Keyword string generated successfully for {base_name}.",
        "job_id": job_id,
        "metadata_file": metadata_path.name,
        "keyword_file": keyword_string_path.name,
        "input_primary_keywords": primary_keywords,
        "input_secondary_keywords": secondary_keywords,
        "keyword_string": keyword_string
    })


# -----------------------------------------------------------
# 4️⃣ SEARCH DATABASES
# -----------------------------------------------------------
@app.post("/database_search")
def database_search(
        job_id: str = Query(..., description="Unique job ID folder name created during upload_extract_metadata"),
        selected_websites: str = Form("PubMed,TandFonline,ScienceDirect,WileyLibrary")
):
    """
    Search selected databases using the keyword string from a specific job_id folder.
    """

    job_dir = BASE_DIR / job_id
    if not job_dir.exists():
        # print(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        logger.error(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        return JSONResponse(
            content={"error": f"Invalid job_id '{job_id}'. Please upload and extract metadata first."},
            status_code=404
        )

    # 🔍 find keyword string JSON
    keyword_files = list(job_dir.glob("*_keywordstring.json"))
    if not keyword_files:
        # print(f"No keyword string found for job_id '{job_id}'.")
        logger.warning(f"No keyword string found for job_id '{job_id}'. Run /keyword_string_generator first.")
        return JSONResponse(
            content={
                "error": f"No keyword string found for job_id '{job_id}'. Please run /keyword_string_generator first."},
            status_code=404
        )

    # print("\n database_search started...")
    logger.info(f"database_search started for job_id: {job_id}")

    keyword_path = keyword_files[0]
    base_name = keyword_path.stem.replace("_keywordstring", "")
    logger.info(f"Keyword string file: {keyword_path.name}")

    # Load keyword string
    with open(keyword_path, "r", encoding="utf-8") as f:
        keyword_data = json.load(f)
    keyword_string = keyword_data.get("keyword_string", "")
    logger.info(f"Loaded keyword string for job_id '{job_id}': {keyword_string}")

    # Load metadata if needed
    metadata_files = list(job_dir.glob("*_metadata.json"))
    metadata_path = metadata_files[0] if metadata_files else None
    metadata_data = {}
    if metadata_path and metadata_path.exists():
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata_data = json.load(f)
        logger.info(f"Loaded metadata file: {metadata_path.name}")

    # Parse websites
    selected_websites_list = [w.strip() for w in selected_websites.split(',') if w.strip()]
    logger.info(f"Selected websites for search: {selected_websites_list}")

    all_data_df = []
    # print(f"Keyword string for job_id '{job_id}': {keyword_string}")
    logger.info(f"Keyword string for job_id '{job_id}': {keyword_string}")

    # --- Database queries ---
    if 'ScienceDirect' in selected_websites_list:
        # print("\nScienceDirect extraction\n")
        logger.info("Starting ScienceDirect extraction")
        sd = scrape_sciencedirect(keyword_string, max_articles=2)
        sd_data = pd.DataFrame(sd)
        if sd_data is not None and not sd_data.empty:
            df_sd = pd.DataFrame(sd_data)
            df_sd['Website'] = 'ScienceDirect'
            all_data_df.append(df_sd)
            logger.info(f"ScienceDirect: {len(df_sd)} articles found")

    if 'TandFonline' in selected_websites_list:
        # print("\nTandFonline extraction\n")
        logger.info("Starting TandFonline extraction")
        tf_data = search_tandfonline(keyword_string, max_results=2)
        if isinstance(tf_data, list):
            df_2 = pd.DataFrame(tf_data, columns=["Title", "Authors(potential reviewers)", "Emails",
                                                  "Author_Email_Map", 'Author_with_Affiliation'])
        else:
            df_2 = pd.DataFrame(
                columns=["Title", "Authors(potential reviewers)", "Emails", "Author_Email_Map",
                         'Author_with_Affiliation'])
        if df_2 is not None and not df_2.empty:
            df_2['Website'] = 'TandFonline'
            all_data_df.append(df_2)
            logger.info(f"TandFonline: {len(df_2)} articles found")

    if 'WileyLibrary' in selected_websites_list:
        # print("\nWileyLibrary extraction\n")
        logger.info("Starting WileyLibrary extraction")
        wiley_df = fetch_article_details(keyword_string, max_articles=2)
        if wiley_df is not None and not wiley_df.empty:
            wiley_df['Website'] = 'WileyLibrary'
            all_data_df.append(wiley_df)
            logger.info(f"WileyLibrary: {len(wiley_df)} articles found")

    if 'PubMed' in selected_websites_list:
        # print("\nPubMed extraction\n")
        logger.info("Starting PubMed extraction")
        pubmed_df = get_pubmed_data(keyword_string, num_articles=2)
        if pubmed_df is not None and not pubmed_df.empty:
            pubmed_df['Website'] = 'PubMed'
            all_data_df.append(pubmed_df)
            logger.info(f"PubMed: {len(pubmed_df)} articles found")

    # Combine results
    if all_data_df:
        final_df = pd.concat(all_data_df, ignore_index=True)
    else:
        final_df = pd.DataFrame(columns=["Title", "Authors(potential reviewers)", "Emails",
                                         "Author_Email_Map", "Author_with_Affiliation", "Website"])
    logger.info(f"Total articles combined: {len(final_df)}")

    # Filter valid entries
    final_df = final_df[(final_df['Author_Email_Map'] != {}) & (final_df['Author_with_Affiliation'] != {})]

    # Extract author-email-affiliation rows
    records = []
    for _, row in final_df.iterrows():
        email_map = row['Author_Email_Map']
        aff_map = row['Author_with_Affiliation']
        if isinstance(email_map, str):
            email_map = eval(email_map)
        if isinstance(aff_map, str):
            aff_map = eval(aff_map)

        for author in email_map:
            records.append({
                "author": author,
                "email": email_map.get(author, ""),
                "aff": aff_map.get(author, "")
            })

    author_email_df = pd.DataFrame(records)
    author_email_df.dropna(inplace=True)
    author_email_df["city"] = author_email_df["aff"].apply(extract_city)
    author_email_df["country"] = author_email_df["aff"].apply(extract_country)

    DEGREE_WORDS = {
        "MD", "PhD", "BD", "MS", "MSc", "BSc", "DDS", "DO", "DVM", "DrPH",
        "MPH", "MBA", "EdD", "DPhil", "ScD", "DSc", "FRCP", "FRCS", "DPM"
    }
    pattern = r"\b(" + "|".join(map(re.escape, DEGREE_WORDS)) + r")\b"
    author_email_df["author"] = (
        author_email_df["author"]
        .str.replace(pattern, "", regex=True)
        .str.replace(r",", "", regex=True)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )

    # Optional: save CSV in job folder
    final_df.to_csv(job_dir / "final_df.csv", index=False)
    final_df_1 = final_df[['Website', 'Authors(potential reviewers)', 'Emails', 'Title']]
    final_df_1.to_csv(job_dir / "final_df_1.csv", index=False)
    author_email_df.to_csv(job_dir / "author_email_df_before_val.csv", index=False)
    logger.info(f"Saved final_df.csv, final_df_1.csv, author_email_df_before_val.csv in job folder: {job_dir}\n")

    return JSONResponse(content={
        "job_id": job_id,
        "keyword_string": keyword_string,
        "selected_websites": selected_websites_list,
        "reviewers_count": len(final_df),
        "reviewers_raw_data_preview": final_df_1.head(10).to_dict(orient='records'),
        "author_email_affiliation_preview": author_email_df.head(10).to_dict(orient='records')
    })


# -----------------------------------------------------------
# 5️⃣ MANUAL AUTHOR ADDITION
# -----------------------------------------------------------
@app.post("/manual_authors")
def manual_authors(
        job_id: str = Query(..., description="Unique job ID"),
        author_name: str = Form(..., description="Full name of the author to add")
):
    """
    Add a manual author to the job's author_email_df and final_df_1.csv
    """

    job_dir = BASE_DIR / job_id
    if not job_dir.exists():
        # print(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        logger.error(f"Invalid job_id '{job_id}'. Job folder does not exist.")
        return JSONResponse(
            content={"error": f"Invalid job_id '{job_id}'. Please upload and extract metadata first."},
            status_code=404
        )

    # print("\nmanual_authors started...")
    logger.info(f"manual_authors started for job_id: {job_id}, author: {author_name}")

    # Load author_email_df if exists, else create empty
    author_email_df_path = job_dir / "author_email_df_before_val.csv"
    if author_email_df_path.exists():
        author_email_df = pd.read_csv(author_email_df_path)
        logger.info(f"Loaded existing author_email_df from {author_email_df_path.name}")
    else:
        author_email_df = pd.DataFrame(columns=["author", "email", "aff", "city", "country"])
        logger.info("No existing author_email_df found, created empty DataFrame")

    # Search PubMed for author details
    try:
        author_email, author_affiliation = search_pubmed_author(author_name)
        logger.info(f"PubMed search result - email: {author_email}, affiliation: {author_affiliation}")
    except Exception as e:
        logger.error(f"Error searching PubMed for author '{author_name}': {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to search for author '{author_name}'. Please try again."},
            status_code=500
        )

    if not author_name.strip() or not author_email or not author_affiliation:
        # print(f"Author '{author_name}' not found or missing email/affiliation.")
        logger.warning(f"Author '{author_name}' not found or missing email/affiliation.")
        return JSONResponse(
            content={"error": f"Author '{author_name}' not found or missing email/affiliation."},
            status_code=404
        )

    # Extract city and country, ensuring they are strings
    try:
        city = extract_city(author_affiliation.strip())
        country = extract_country(author_affiliation.strip())
        
        # Convert to string if they are sets or other non-string types
        if isinstance(city, set):
            city = ', '.join(city) if city else ""
        elif not isinstance(city, str):
            city = str(city) if city else ""
        
        if isinstance(country, set):
            country = ', '.join(country) if country else ""
        elif not isinstance(country, str):
            country = str(country) if country else ""
    except Exception as e:
        logger.error(f"Error extracting city/country from affiliation: {str(e)}")
        city = ""
        country = ""
    
    new_author = {
        "author": author_name.strip(),
        "email": author_email.strip(),
        "aff": author_affiliation.strip(),
        "city": city,
        "country": country
    }

    # Add to author_email_df
    try:
        author_email_df = pd.concat([author_email_df, pd.DataFrame([new_author])], ignore_index=True)
        author_email_df.dropna(inplace=True)
        
        # Ensure city and country columns are strings
        author_email_df["city"] = author_email_df["aff"].apply(lambda x: str(extract_city(x)) if extract_city(x) else "")
        author_email_df["country"] = author_email_df["aff"].apply(lambda x: str(extract_country(x)) if extract_country(x) else "")
        
        author_email_df.to_csv(author_email_df_path, index=False)
        logger.info(f"Added author '{author_name}' to {author_email_df_path.name}\n")

        return JSONResponse(
            content={
                "message": f"Author '{author_name}' added successfully.",
                "job_id": job_id,
                "author_data": new_author
            }
        )
    except Exception as e:
        logger.error(f"Error adding author to CSV: {str(e)}")
        return JSONResponse(
            content={"error": f"Failed to save author data: {str(e)}"},
            status_code=500
        )


# -----------------------------------------------------------
# 6️⃣ VALIDATE AUTHORS
# -----------------------------------------------------------
@app.post("/validate_authors")
def validate_authors(
        job_id: str = Query(..., description="Unique job ID folder name created during upload_extract_metadata")
):
    """
    Validate authors: fetch publication metrics, coauthoring, and condition scoring.
    Uses author_email_df_before_val.csv and keyword string from the given job folder.
    """

    job_dir = BASE_DIR / job_id
    if not job_dir.exists():
        # print(f"Invalid job_id '{job_id}'")
        logger.error(f"Invalid job_id '{job_id}'")
        return JSONResponse(
            content={"error": f"Invalid job_id '{job_id}'. Please run /database_search first."},
            status_code=404
        )

    # print("\nvalidate_authors started...")
    logger.info(f"validate_authors started for job_id: {job_id}")

    # Load author_email_df_before_val
    author_email_df_path = job_dir / "author_email_df_before_val.csv"
    if not author_email_df_path.exists():
        # print("author_email_df_before_val.csv not found.")
        logger.error("author_email_df_before_val.csv not found.")
        return JSONResponse(
            content={"error": "No author_email_df_before_val.csv found. Please run /database_search first."},
            status_code=404
        )

    author_email_df = pd.read_csv(author_email_df_path)
    logger.info(f"Loaded author_email_df_before_val.csv with {len(author_email_df)} authors")

    # Load keyword string
    keyword_files = list(job_dir.glob("*_keywordstring.json"))
    keyword_string = ""
    if keyword_files:
        with open(keyword_files[0], "r", encoding="utf-8") as f:
            keyword_data = json.load(f)
            keyword_string = keyword_data.get("keyword_string", "")
    # print("keyword_string: ", keyword_string)
    logger.info(f"Loaded keyword string: {keyword_string}")

    # --- Compute publication stats ---
    # print("\nGetting total no of publication from PubMed\n")
    logger.info("Getting total no of publication from PubMed")
    author_email_df["Total_Publications"] = author_email_df["author"].apply(lambda x: get_pubmed_count_selenium(x))

    logger.info("Getting total no of first author publication from PubMed")
    author_email_df["Total_Publications_first"] = author_email_df["author"].apply(lambda x: get_pubmed_count_selenium(x, role='first'))

    logger.info("Getting total no of last author publication from PubMed")
    author_email_df["Total_Publications_last"] = author_email_df["author"].apply(lambda x: get_pubmed_count_selenium(x, role='last'))

    # print("\nGetting total no of publication from last 10 years from PubMed\n")
    logger.info("Getting total no of publication from last 10 years from PubMed")
    author_email_df["Publications_10_years"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=10)
    )

    logger.info("Getting total no of first author publication from last 10 years from PubMed")
    author_email_df["Publications_10_years_first"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=10, role='first')
    )

    logger.info("Getting total no of last author publication from last 10 years from PubMed")
    author_email_df["Publications_10_years_last"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=10, role='last')
    )

    # print("\nGetting total no of publication from last 5 years from PubMed with keywords\n")
    logger.info("Getting total no of publication from last 5 years from PubMed with keywords")
    author_email_df["Publications_5_years"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=5)
    )

    logger.info("Getting total no of first publication from last 5 years from PubMed with keywords")
    author_email_df["Publications_5_years_first"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=5, role='first')
    )

    logger.info("Getting total no of last publication from last 5 years from PubMed with keywords")
    author_email_df["Publications_5_years_last"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=5, role='last')
    )

    # print("\nGetting total no of publication from last 5 years from PubMed with keywords\n")
    logger.info("Getting total no of relevant publication from last 5 years from PubMed with keywords")
    author_email_df["Relevant_Publications_5_years"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=5, keyword_string=keyword_string)
    )

    logger.info("Getting total no of relevant first publication from last 5 years from PubMed with keywords")
    author_email_df["Relevant_Publications_5_years_first"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=5, keyword_string=keyword_string, role='first')
    )

    logger.info("Getting total no of relevant last publication from last 5 years from PubMed with keywords")
    author_email_df["Relevant_Publications_5_years_last"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=5, keyword_string=keyword_string, role='last')
    )

    # print("\nGetting total no of publication from last 2 years from PubMed\n")
    logger.info("Getting total no of publication from last 2 years from PubMed")
    author_email_df["Publications_2_years)"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=2)
    )

    logger.info("Getting total no of first publication from last 2 years from PubMed")
    author_email_df["Publications_2_years_first)"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=2, role='first')
    )

    logger.info("Getting total no of last publication from last 2 years from PubMed")
    author_email_df["Publications_2_years_last)"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=2, role='last')
    )

    # print("\nGetting total no of publication from last year from PubMed\n")
    logger.info("Getting total no of publication from last year from PubMed")
    author_email_df["Publications_last_year)"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=1)
    )

    logger.info("Getting total no of first publication from last year from PubMed")
    author_email_df["Publications_last_year_first)"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=1, role='first')
    )

    logger.info("Getting total no of last publication from last year from PubMed")
    author_email_df["Publications_last_year_last)"] = author_email_df["author"].apply(
        lambda x: get_pubmed_count_selenium(x, last_n_years=1, role='last')
    )

    # print("\nGetting total no of clinical trials from last 2 years from PubMed\n")
    logger.info("Getting total no of clinical trials from last 2 years from PubMed")
    author_email_df["Clinical_Trials_no"] = author_email_df["author"].apply(
        lambda x: clinical_trails_no(x, last_n_years=2)
    )

    # print("\nGetting total no of retracted publications from PubMed\n")
    logger.info("Getting total no of retracted publications from PubMed")
    author_email_df["Retracted_Pubs_no"] = author_email_df["author"].apply(
        lambda x: pubmed_filtered_count(x, filter_label="Retracted Publication")
    )

    # print("\nGetting total no of clinical studies from last 2 years from PubMed\n")
    logger.info("Getting total no of clinical studies from last 2 years from PubMed")
    author_email_df["Clinical_study_no"] = author_email_df["author"].apply(
        lambda x: pubmed_filtered_count(x, filter_label="Clinical Study", last_n_years=2)
    )

    # print("\nGetting total no of case reports from last 2 years from PubMed\n")
    logger.info("Getting total no of case reports from last 2 years from PubMed")
    author_email_df["Case_reports_no"] = author_email_df["author"].apply(
        lambda x: pubmed_filtered_count(x, filter_label="Case Reports", last_n_years=2)
    )

    # print("\nGetting total no of T&F publications from last year\n")
    logger.info("Getting total no of T&F publications from last year")
    author_email_df["TF_Publications_last_year"] = author_email_df["author"].apply(
        lambda x: search_tandfonline_author(x, year_from="2024", year_to="2025")
    )

    # print("\nGetting total no of english publications from PubMed\n")
    logger.info("Getting total no of english publications from PubMed")
    author_email_df["English_Pubs"] = author_email_df["author"].apply(lambda x: pubmed_english_count(x))

    # --- Coauthorship check ---
    # print("\nChecking coauthoring\n")
    logger.info("Checking coauthoring")
    authors = author_email_df["author"].tolist()
    coauthor_results = []
    for idx, row in author_email_df.iterrows():
        author_from_df = row['author'].strip()
        coauthored_with_any = False
        for ref_author in authors:
            if check_coauthorship_selenium(author_from_df, ref_author.strip()):
                # print(f"Checking coauthor: {ref_author.strip()}")
                logger.info(f"Checking coauthor: {ref_author.strip()}")
                coauthored_with_any = True
                break
        coauthor_results.append(coauthored_with_any)
    author_email_df['coauthor'] = coauthor_results

    # --- Affiliation and Country Matching ---
    # print("\nChecking affiliation and country match\n")
    logger.info("Checking affiliation and country match")
    original_aff = author_email_df['aff'].tolist()
    countries = country_extract(original_aff)
    countries_list = json.loads(countries)
    # print('\nOriginal country list: ', countries_list)
    logger.info(f"Original country list: {countries_list}")
    unique_countries_list = list(dict.fromkeys(countries_list))

    author_email_df['country_match'] = author_email_df['aff'].apply(
        lambda x: check_country_in_list(x, unique_countries_list)
    )
    author_email_df['aff_match'] = author_email_df['aff'].apply(lambda x: check_aff_match(x, original_aff))

    # --- Condition Columns ---
    author_email_df['no_of_pub_condition_10_years'] = author_email_df['Publications_10_years'].apply(
        lambda x: 1 if x >= 8 else 0
    )
    author_email_df['no_of_pub_condition_5_years'] = author_email_df['Relevant_Publications_5_years'].apply(
        lambda x: 1 if x >= 3 else 0
    )
    author_email_df['no_of_pub_condition_2_years'] = author_email_df['Publications_2_years)'].apply(
        lambda x: 1 if x >= 1 else 0
    )
    author_email_df['english_condition'] = (
        (author_email_df['Total_Publications'] > 0) &
        ((author_email_df['English_Pubs'] / author_email_df['Total_Publications']) > 0.5)
    ).astype(int)
    author_email_df['coauthor_condition'] = author_email_df['coauthor'].apply(lambda x: 1 if not x else 0)
    author_email_df['aff_condition'] = author_email_df['aff_match'].apply(lambda x: 1 if x == "NO" else 0)
    author_email_df['country_match_condition'] = author_email_df['country_match'].apply(lambda x: 1 if x == "YES" else 0)
    author_email_df['retracted_condition'] = author_email_df['Retracted_Pubs_no'].apply(lambda x: 1 if x > 1 else 0)

    # --- Scoring ---
    author_email_df['conditions_met'] = (
        author_email_df[
            ['no_of_pub_condition_10_years', 'english_condition', 'coauthor_condition', 'aff_condition',
             'country_match_condition', 'no_of_pub_condition_5_years', 'no_of_pub_condition_2_years',
             'retracted_condition']
        ].sum(axis=1)
    )
    author_email_df['conditions_satisfied'] = author_email_df['conditions_met'].astype(str) + ' of 8'
    author_email_df = author_email_df.sort_values(by='conditions_met', ascending=False)

    # --- Save results ---
    after_val_path = job_dir / "author_email_df_after_val.csv"
    final_authors_path = job_dir / "Final_authors.csv"
    display_path = job_dir / "Final_authors_display.csv"

    author_email_df.to_csv(after_val_path, index=False)
    author_email_df.rename(columns={'author': 'reviewer'}, inplace=True)
    author_email_df.to_csv(final_authors_path, index=False)

    author_email_df_display = author_email_df[
        ['reviewer', 'email', 'aff', 'country', 'Total_Publications', 'English_Pubs',
         'Publications_10_years', 'Relevant_Publications_5_years',
         'Publications_2_years)', 'Publications_last_year', 'Clinical_Trials_no', 'Clinical_study_no',
         'Case_reports_no', 'Retracted_Pubs_no', 'TF_Publications_last_year', 'coauthor',
         'country_match', 'aff_match', 'no_of_pub_condition_10_years', 'no_of_pub_condition_5_years',
         'no_of_pub_condition_2_years', 'english_condition', 'coauthor_condition', 'aff_condition',
         'country_match_condition', 'retracted_condition', 'conditions_met', 'conditions_satisfied']
    ]
    author_email_df_display.to_csv(display_path, index=False)

    # print(f"\nSaved validated author data in: {after_val_path}, {final_authors_path}, {display_path}")
    logger.info(f"Saved validated author data in: {after_val_path}, {final_authors_path}, {display_path}")
    logger.info(f"Validation complete for job_id: {job_id}\n")

    return JSONResponse(content={
        "message": f"Author validation and scoring completed successfully for job_id '{job_id}'.",
        "job_id": job_id,
        "total_authors": len(author_email_df),
        "top_5_preview": author_email_df_display.head(5).to_dict(orient="records")
    })


# -----------------------------------------------------------
# 7️⃣ RECOMMENDED REVIEWERS
# -----------------------------------------------------------
@app.get("/recommended_reviewers")
def recommended_reviewers(job_id: str = Query(..., description="Unique job ID")):
    """
    Fetch and return the list of recommended reviewers (authors) and their evaluation details.
    """
    # print(f"\nFetching recommended reviewers for job_id: {job_id}")
    logger.info(f"Fetching recommended reviewers for job_id: {job_id}")
    job_dir = BASE_DIR / job_id

    if not job_dir.exists():
        # print("❌ Job directory not found.")
        logger.info(f"Job directory not found.")
        return JSONResponse(
            content={"error": f"Invalid job_id '{job_id}'. Please upload and process metadata first."},
            status_code=404
        )

    final_authors_path = job_dir / "Final_authors.csv"

    if not final_authors_path.exists():
        # print("❌ Final_authors.csv not found.")
        logger.info(f"Final_authors.csv not found.")
        return JSONResponse(
            content={"error": f"No reviewer data found for job_id '{job_id}'. Please run the validation first."},
            status_code=404
        )

    # print("✅ Loading Final_authors.csv...")
    author_email_df = pd.read_csv(final_authors_path)

    # Convert DataFrame to JSON
    data = json.loads(author_email_df.to_json(orient="records"))

    # print("✅ Returning reviewer data as JSON response.")
    logger.info(f"Recommended reviewers successful for job_id: {job_id}")

    return JSONResponse(
        content={
            "job_id": job_id,
            "reviewer_count": len(author_email_df),
            "reviewers": data
        }
    )

