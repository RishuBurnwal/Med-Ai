import json
import random
from datetime import datetime, timedelta, timezone

from config.database import close_postgres_connection, connect_to_postgres, require_pool
import bcrypt
from uuid import uuid4
from routes.common import now_iso

# ── Random data generators ──

FIRST_NAMES_M = [
    "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan",
    "Kabir","Rohan","Dev","Shaurya","Dhruv","Yash","Ansh","Veer","Rudra","Aryan",
    "Shivansh","Harsh","Jay","Karan","Ravi","Raj","Amit","Vikram","Siddharth","Rahul",
    "Arun","Nitin","Manoj","Suresh","Deepak","Pankaj","Sanjay","Vijay","Anil","Sunil",
]
FIRST_NAMES_F = [
    "Aanya","Diya","Ananya","Saanvi","Riya","Ishita","Myra","Sara","Navya","Pari",
    "Shreya","Aditi","Tanya","Nisha","Kavya","Jiya","Anika","Rhea","Siya","Ira",
    "Pooja","Neha","Priya","Sneha","Divya","Komal","Anjali","Swati","Ritu","Nidhi",
    "Deepika","Shweta","Rashmi","Garima","Poonam","Kirti","Bhavna","Neelam","Radhika","Shalini",
]
LAST_NAMES = [
    "Sharma","Verma","Patel","Kumar","Gupta","Singh","Reddy","Nair","Menon","Joshi",
    "Rao","Iyer","Das","Bose","Chopra","Malhotra","Khanna","Kapoor","Mehta","Agarwal",
    "Pillai","Krishnan","Bhatt","Shah","Desai","Pandey","Mishra","Dubey","Saxena","Yadav",
    "Srinivasan","Rajan","Nambiar","Kurian","Mathew","Thomas","George","Jacob","Cherian","Philip",
]
BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"]
GENDERS = ["male","female"]
DEPARTMENTS = [
    "Cardiology","Neurology","Orthopedics","Pediatrics","Dermatology","Psychiatry",
    "ENT","Ophthalmology","Oncology","Gastroenterology","Pulmonology","Nephrology",
    "Endocrinology","Gynecology","Urology","Rheumatology","Hematology","Infectious Disease",
    "General Medicine","Emergency Medicine",
]
DOCTOR_SPECS = [
    "Cardiologist","Neurologist","Orthopedic Surgeon","Pediatrician","Dermatologist","Psychiatrist",
    "ENT Specialist","Ophthalmologist","Oncologist","Gastroenterologist","Pulmonologist","Nephrologist",
    "Endocrinologist","Gynecologist","Urologist","Rheumatologist","Hematologist","Infectious Disease Specialist",
    "General Physician","Emergency Physician",
]
NURSE_SPECS = [
    "Critical Care Nurse","Surgical Nurse","Pediatric Nurse","Emergency Nurse","Oncology Nurse","Cardiac Nurse"
]
ALLERGIES = [
    "Penicillin","Cephalosporins","Sulfa Drugs","Aspirin","NSAIDs","Codeine",
    "Latex","Iodine","Bee Stings","Peanuts","Shellfish","Eggs","Milk","Gluten",
    "Soy","Dust Mites","Pollen","Mold","Animal Dander",
]
MEDICATIONS = [
    "Metformin","Atorvastatin","Lisinopril","Losartan","Omeprazole","Metoprolol","Amlodipine",
    "Hydrochlorothiazide","Simvastatin","Levothyroxine","Gabapentin","Pantoprazole","Furosemide",
    "Aspirin","Ibuprofen","Acetaminophen","Amoxicillin","Azithromycin","Ciprofloxacin",
    "Doxycycline","Prednisone","Warfarin","Clopidogrel","Insulin","Albuterol",
]
MEDICAL_CONDITIONS = [
    "Hypertension","Type 2 Diabetes","Hyperlipidemia","Asthma","Hypothyroidism",
    "GERD","Coronary Artery Disease","COPD","Osteoarthritis","Anemia",
    "Migraine","Depression","Anxiety","Chronic Kidney Disease","Osteoporosis",
    "Rheumatoid Arthritis","Epilepsy","Parkinson's Disease","Glaucoma","Cataracts",
]
HOSPITAL_AREAS = [
    "Sector A","Sector B","Sector C","Main Building","East Wing","West Wing",
    "North Wing","South Wing","Tower 1","Tower 2","Annex Building","Emergency Block",
]
STREETS = [
    "MG Road","Park Street","Linking Road","Banjara Hills","Jubilee Hills","Marine Drive",
    "Church Street","Commercial Street","Brigade Road","Residency Road","St. Marks Road",
    "Koramangala","Indiranagar","Whitefield","HSR Layout","JP Nagar","Sadashiv Nagar",
    "Malleshwaram","Rajajinagar","Basavanagudi",
]
CITIES = [
    "Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Pune",
    "Jaipur","Lucknow","Nagpur","Indore","Bhopal","Visakhapatnam","Vadodara",
]
DISEASES = [
    "Upper respiratory tract infection","Acute gastroenteritis","Urinary tract infection",
    "Routine health checkup","Chronic back pain","Skin rash evaluation","Eye examination",
    "Chest pain evaluation","Persistent headache","Joint pain assessment","Fever evaluation",
    "Diabetes management follow-up","Hypertension check-up","Post-surgery follow-up",
    "Vaccination","Prenatal checkup","Allergy assessment","Sleep disorder evaluation",
]

random.seed(42)


def random_phone():
    return f"98{random.randint(10000000, 99999999)}"


def random_date(start_year=2018, end_year=2025):
    start = datetime(start_year, 1, 1, tzinfo=timezone.utc)
    end = datetime(end_year, 1, 1, tzinfo=timezone.utc)
    return start + timedelta(seconds=random.randint(0, int((end - start).total_seconds())))


def pick_name():
    gender = random.choice(GENDERS)
    first = random.choice(FIRST_NAMES_M if gender == "male" else FIRST_NAMES_F)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}", gender


async def main() -> None:
    await connect_to_postgres()
    try:
        db = require_pool()
        async with db.transaction():
            # ── Clean existing data ──
            for table in ["prescription_medications","prescriptions","lab_tests","billing","beds","wards","staff","departments","report_analyses","appointments","patients","notifications","users"]:
                await db.execute(f"DELETE FROM {table}")

            # ── Create admin user ──
            admin_hash = bcrypt.hashpw(b"Admin@123", bcrypt.gensalt()).decode('utf-8')
            await db.execute(
                "INSERT INTO users (name,email,role,hashed_password,is_active,created_at) VALUES ($1,$2,$3,$4,1,$5)",
                "Hospital Admin", "admin@hospital.com", "admin", admin_hash, now_iso(),
            )

            # ── Create Departments ──
            created = now_iso()
            dept_ids = {}
            for i, dept_name in enumerate(DEPARTMENTS[:15]):  # First 15 departments
                await db.execute(
                    "INSERT INTO departments (name,description,head_doctor,location,phone,is_active,created_at) VALUES ($1,$2,$3,$4,$5,1,$6)",
                    dept_name, f"{dept_name} Department - providing specialized care", 
                    None, random.choice(HOSPITAL_AREAS), random_phone(), created,
                )
                row = await db.fetchrow("SELECT id FROM departments WHERE name = $1", dept_name)
                dept_ids[dept_name] = row['id']

            print(f"Created {len(dept_ids)} departments")

            # ── Create Staff (30) ──
            staff_ids = []
            staff_names = []
            doctor_names = []
            # 15 doctors
            for i in range(15):
                name, gender = pick_name()
                dept_name = DEPARTMENTS[i % 15]
                spec = DOCTOR_SPECS[i % 15]
                email = f"dr.{name.lower().replace(' ', '.')}@hospital.com"
                phone = random_phone()
                staff_hash = bcrypt.hashpw(b"Staff@123", bcrypt.gensalt()).decode('utf-8')
                
                # Create user account
                await db.execute(
                    "INSERT INTO users (name,email,role,hashed_password,is_active,created_at) VALUES ($1,$2,$3,$4,1,$5)",
                    name, email, 'doctor', staff_hash, created,
                )
                user_row = await db.fetchrow("SELECT id FROM users WHERE email = $1", email)
                user_id = user_row['id']

                staff_id = f"STF-{i+1:04d}"
                await db.execute(
                    """INSERT INTO staff (staff_id,user_id,name,email,phone,role,specialization,department_id,qualification,experience_years,salary,joining_date,created_at,updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
                    staff_id, user_id, name, email, phone, 'doctor', spec, dept_ids.get(dept_name),
                    "MBBS, MD", random.randint(3, 25), round(random.uniform(80000, 300000), 2),
                    random_date(2015, 2024).isoformat(), created, created,
                )
                staff_ids.append(staff_id)
                staff_names.append(name)
                doctor_names.append(f"Dr. {name}")

            # 8 nurses
            for i in range(8):
                name, gender = pick_name()
                email = f"nurse.{name.lower().replace(' ', '.')}@hospital.com"
                phone = random_phone()
                staff_hash = bcrypt.hashpw(b"Staff@123", bcrypt.gensalt()).decode('utf-8')
                await db.execute(
                    "INSERT INTO users (name,email,role,hashed_password,is_active,created_at) VALUES ($1,$2,$3,$4,1,$5)",
                    name, email, 'staff', staff_hash, created,
                )
                user_row = await db.fetchrow("SELECT id FROM users WHERE email = $1", email)
                staff_id = f"STF-{16+i:04d}"
                await db.execute(
                    """INSERT INTO staff (staff_id,user_id,name,email,phone,role,specialization,department_id,qualification,experience_years,salary,joining_date,created_at,updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
                    staff_id, user_row['id'], name, email, phone, 'nurse',
                    random.choice(NURSE_SPECS), random.choice(list(dept_ids.values())),
                    "B.Sc Nursing, RN", random.randint(1, 20), round(random.uniform(30000, 80000), 2),
                    random_date(2016, 2024).isoformat(), created, created,
                )
                staff_ids.append(staff_id)
                staff_names.append(name)

            # 4 receptionists
            for i in range(4):
                name, gender = pick_name()
                email = f"reception.{name.lower().replace(' ', '.')}@hospital.com"
                phone = random_phone()
                staff_hash = bcrypt.hashpw(b"Staff@123", bcrypt.gensalt()).decode('utf-8')
                await db.execute(
                    "INSERT INTO users (name,email,role,hashed_password,is_active,created_at) VALUES ($1,$2,$3,$4,1,$5)",
                    name, email, 'staff', staff_hash, created,
                )
                user_row = await db.fetchrow("SELECT id FROM users WHERE email = $1", email)
                staff_id = f"STF-{24+i:04d}"
                await db.execute(
                    """INSERT INTO staff (staff_id,user_id,name,email,phone,role,specialization,department_id,qualification,experience_years,salary,joining_date,created_at,updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
                    staff_id, user_row['id'], name, email, phone, 'receptionist', '',
                    random.choice(list(dept_ids.values())), "Graduate", random.randint(1, 10),
                    round(random.uniform(20000, 40000), 2),
                    random_date(2018, 2024).isoformat(), created, created,
                )
                staff_ids.append(staff_id)
                staff_names.append(name)

            # 3 pharmacists
            for i in range(3):
                name, gender = pick_name()
                email = f"pharma.{name.lower().replace(' ', '.')}@hospital.com"
                phone = random_phone()
                staff_hash = bcrypt.hashpw(b"Staff@123", bcrypt.gensalt()).decode('utf-8')
                await db.execute(
                    "INSERT INTO users (name,email,role,hashed_password,is_active,created_at) VALUES ($1,$2,$3,$4,1,$5)",
                    name, email, 'staff', staff_hash, created,
                )
                user_row = await db.fetchrow("SELECT id FROM users WHERE email = $1", email)
                staff_id = f"STF-{28+i:04d}"
                await db.execute(
                    """INSERT INTO staff (staff_id,user_id,name,email,phone,role,specialization,department_id,qualification,experience_years,salary,joining_date,created_at,updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)""",
                    staff_id, user_row['id'], name, email, phone, 'pharmacist', '',
                    random.choice(list(dept_ids.values())), "B.Pharm, M.Pharm", random.randint(1, 15),
                    round(random.uniform(35000, 70000), 2),
                    random_date(2017, 2024).isoformat(), created, created,
                )
                staff_ids.append(staff_id)
                staff_names.append(name)

            # Assign department heads (first 5 doctors become heads)
            for i in range(min(5, len(doctor_names))):
                doc_row = await db.fetchrow("SELECT id FROM staff WHERE name = $1", doctor_names[i].replace("Dr. ", ""))
                if doc_row:
                    dept_id = list(dept_ids.values())[i]
                    await db.execute("UPDATE departments SET head_doctor = $1 WHERE id = $2", doctor_names[i], dept_id)

            print(f"Created {len(staff_ids)} staff members")

            # ── Create Wards & Beds ──
            ward_names_list = [
                ("WD-1", "General Ward A", 1), ("WD-2", "General Ward B", 2),
                ("WD-3", "ICU Ward", 1), ("WD-4", "Pediatric Ward", 2),
                ("WD-5", "Maternity Ward", 3), ("WD-6", "Surgical Ward", 3),
                ("WD-7", "Cardiac Care Unit", 1), ("WD-8", "Emergency Ward", 0),
                ("WD-9", "Orthopedic Ward", 2), ("WD-10", "Oncology Ward", 3),
            ]
            ward_ids = []
            for wn, wname, floor in ward_names_list:
                dept = random.choice(list(dept_ids.values()))
                total = random.randint(8, 20)
                await db.execute(
                    "INSERT INTO wards (ward_number,name,floor,department_id,total_beds,available_beds,is_active,created_at) VALUES ($1,$2,$3,$4,$5,$6,1,$7)",
                    wn, wname, floor, dept, total, total, created,
                )
                ward_row = await db.fetchrow("SELECT id FROM wards WHERE ward_number = $1", wn)
                ward_ids.append(ward_row['id'])

                # Create beds for this ward
                bed_types_list = ["general","general","general","semi_private","private","general","general","general","semi_private","icu"]
                for b in range(total):
                    bed_num = f"{wn}-{b+1:02d}"
                    room = f"{floor}{b//2+1:02d}"
                    btype = bed_types_list[b % len(bed_types_list)]
                    await db.execute(
                        "INSERT INTO beds (bed_number,ward_id,room_number,bed_type,status,is_active,created_at) VALUES ($1,$2,$3,$4,$5,1,$6)",
                        bed_num, ward_row['id'], room, btype, 'available', created,
                    )

            print(f"Created {len(ward_ids)} wards with beds")

            # ── Create Patients (100) ──
            patient_ids = []
            for i in range(100):
                name, gender = pick_name()
                age = random.randint(1, 90)
                blood = random.choice(BLOOD_GROUPS)
                phone = random_phone()
                email = f"patient{i+1}@example.com"
                street = random.choice(STREETS)
                city = random.choice(CITIES)
                address = f"{i+1}, {street}, {city}"
                emergency = f"Family - {random_phone()}"

                history = random.sample(MEDICAL_CONDITIONS, random.randint(0, 3))
                allergies = random.sample(ALLERGIES, random.randint(0, 2))
                medications = random.sample(MEDICATIONS, random.randint(0, 3))

                created_date = random_date(2019, 2025).isoformat()
                await db.execute(
                    """INSERT INTO patients (patient_id,name,age,gender,blood_group,phone,email,address,emergency_contact,medical_history,allergies,current_medications,is_active,created_at,updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,$13,$14)""",
                    f"PAT-{i+1:04d}", name, age, gender, blood, phone, email, address, emergency,
                    json.dumps(history), json.dumps(allergies), json.dumps(medications), created_date, created_date,
                )
                patient_ids.append(f"PAT-{i+1:04d}")

            print(f"Created {len(patient_ids)} patients")

            # ── Create Appointments (200+) ──
            appt_count = 0
            for i in range(220):
                pid = random.choice(patient_ids)
                doc = random.choice(doctor_names)
                dept = random.choice(DEPARTMENTS[:15])
                appt_date = random_date(2024, 2025)
                appt_type = random.choice(["in-person","teleconsult"])
                status = random.choice(["scheduled","confirmed","completed","cancelled"])
                reason = random.choice(DISEASES)
                await db.execute(
                    """INSERT INTO appointments (patient_id,doctor_name,department,appointment_date,reason,appointment_type,status,created_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
                    pid, doc, dept, appt_date.isoformat(), reason, appt_type, status, appt_date.isoformat(),
                )
                appt_count += 1

            print(f"Created {appt_count} appointments")

            # ── Create Billing records (150+) ──
            payment_methods = ["cash","card","insurance","upi","online"]
            bill_count = 0
            for i in range(180):
                pid = random.choice(patient_ids)
                bill_type = random.choice(["consultation","admission","lab_test","procedure","pharmacy","emergency"])
                amount = round(random.uniform(200, 50000), 2)
                discount = round(amount * random.uniform(0, 0.15), 2)
                tax = round((amount - discount) * 0.05, 2)
                total = amount - discount + tax
                pay_status = random.choice(["pending","paid","partial","paid","paid"])  # More paid
                paid = total if pay_status == "paid" else (round(total * random.uniform(0.3, 0.9), 2) if pay_status == "partial" else 0)
                pmethod = random.choice(payment_methods) if pay_status in ("paid", "partial") else None
                inv = f"INV-{uuid4().hex[:8].upper()}"
                bill_date = random_date(2024, 2025).isoformat()
                await db.execute(
                    """INSERT INTO billing (invoice_number,patient_id,bill_type,description,amount,discount,tax,total_amount,payment_status,payment_method,paid_amount,billing_date,created_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)""",
                    inv, pid, bill_type, f"{bill_type} charges - {random.choice(DISEASES)}",
                    amount, discount, tax, total, pay_status, pmethod, paid, bill_date, bill_date,
                )
                bill_count += 1

            print(f"Created {bill_count} billing records")

            # ── Create Lab Tests (120+) ──
            lab_tests_list = [
                "Complete Blood Count", "Basic Metabolic Panel", "Comprehensive Metabolic Panel",
                "Lipid Panel", "Thyroid Function Test", "HbA1c", "Liver Function Test",
                "Renal Function Test", "Urinalysis", "CRP Test", "ESR Test",
                "Vitamin D Test", "Vitamin B12 Test", "Iron Studies", "Blood Culture",
                "ECG", "Chest X-Ray", "MRI Brain", "CT Abdomen", "Ultrasound Abdomen",
            ]
            lab_statuses = ["ordered","collected","processing","completed","completed","completed"]
            lab_count = 0
            for i in range(130):
                pid = random.choice(patient_ids)
                test_name = random.choice(lab_tests_list)
                cat = "radiology" if test_name in ("Chest X-Ray","MRI Brain","CT Abdomen","Ultrasound Abdomen","ECG") else "pathology"
                sample = "blood" if cat == "pathology" else "imaging"
                status = random.choice(lab_statuses)
                doc = random.choice(doctor_names)
                test_id = f"LAB-{uuid4().hex[:8].upper()}"
                result_text = "" if status in ("ordered","collected","processing") else f"{test_name} results within normal limits" if random.random() > 0.3 else "Abnormal - further evaluation recommended"
                is_abnormal = 1 if "Abnormal" in result_text else 0
                lab_date = random_date(2024, 2025).isoformat()
                await db.execute(
                    """INSERT INTO lab_tests (test_id,patient_id,doctor_name,test_name,category,sample_type,status,result_text,is_abnormal,notes,ordered_by,created_at,updated_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)""",
                    test_id, pid, doc, test_name, cat, sample, status, result_text, is_abnormal,
                    "Routine test" if status == "ordered" else "", doc, lab_date, lab_date,
                )
                lab_count += 1

            print(f"Created {lab_count} lab tests")

            # ── Create Prescriptions (90+) ──
            presc_count = 0
            for i in range(100):
                pid = random.choice(patient_ids)
                doc = random.choice(doctor_names)
                diagnosis = random.choice(MEDICAL_CONDITIONS)
                presc_id = f"PRESC-{uuid4().hex[:8].upper()}"
                presc_date = random_date(2024, 2025).isoformat()

                row = await db.fetchrow(
                    """INSERT INTO prescriptions (prescription_id,patient_id,doctor_name,diagnosis,notes,is_active,created_at)
                       VALUES ($1,$2,$3,$4,$5,1,$6) RETURNING id""",
                    presc_id, pid, doc, diagnosis, f"Follow up in {random.choice(['2 weeks','1 month','3 months','6 months'])}",
                    presc_date,
                )
                # Add 1-4 medications per prescription
                for med in random.sample(MEDICATIONS, random.randint(1, 4)):
                    freq = random.choice(["Once daily","Twice daily","Thrice daily","Before meals","After meals","At bedtime"])
                    dur = random.choice(["5 days","7 days","10 days","14 days","1 month","3 months"])
                    route = random.choice(["oral","topical","injection","inhalation"])
                    await db.execute(
                        """INSERT INTO prescription_medications (prescription_id,medication_name,dosage,frequency,duration,route,instructions)
                           VALUES ($1,$2,$3,$4,$5,$6,$7)""",
                        row['id'], med, f"{random.choice(['5','10','20','25','50','100','250','500'])} {random.choice(['mg','mcg','ml','IU'])}",
                        freq, dur, route, random.choice(["Take with food","Take on empty stomach","Avoid alcohol","May cause drowsiness",""]),
                    )
                presc_count += 1

            print(f"Created {presc_count} prescriptions")

            # ── Create Notifications (30) ──
            for i in range(30):
                ntype = random.choice(["appointment","billing","lab","prescription","admission","system"])
                titles = {
                    "appointment": "New appointment scheduled",
                    "billing": "Payment received",
                    "lab": "Lab results available",
                    "prescription": "New prescription issued",
                    "admission": "Patient admitted",
                    "system": "System update",
                }
                notif_date = random_date(2024, 2025).isoformat()
                await db.execute(
                    "INSERT INTO notifications (type,title,message,is_read,created_at) VALUES ($1,$2,$3,$4,$5)",
                    ntype, titles[ntype], f"Notification about {ntype} - {random.choice([p.split(' - ')[0] for p in DISEASES])}",
                    random.choice([0, 0, 0, 1]), notif_date,
                )

            # ── Update department heads ──
            # Already done above

            # ── Update wards with correct available_beds ──
            for wid in ward_ids:
                avail = await db.fetchval("SELECT COUNT(*) FROM beds WHERE ward_id = $1 AND status = 'available' AND is_active = 1", wid)
                await db.execute("UPDATE wards SET available_beds = $1 WHERE id = $2", avail, wid)

        print("\n[SUCCESS] Database seeded successfully!")
        print(f"   - 1 Admin user (admin@hospital.com / Admin@123)")
        print(f"   - 15 Departments")
        print(f"   - 30 Staff members (15 doctors, 8 nurses, 4 receptionists, 3 pharmacists)")
        print(f"   - 10 Wards with beds")
        print(f"   - 100 Patients")
        print(f"   - 220 Appointments")
        print(f"   - 180 Billing records")
        print(f"   - 130 Lab tests")
        print(f"   - 100 Prescriptions")
        print(f"   - 30 Notifications")

    finally:
        await close_postgres_connection()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
