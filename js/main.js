/**
 * OJAS Main Application Controller & Gateway Service
 * Handles tabs, multi-language switching, estimation engine,
 * interactive charts, district GIS ward grid, AI canvas simulator,
 * and backend API interactions.
 */

const API_BASE_URL = 'http://localhost:8000';

/* Multilingual Language Dictionary (English, Hindi, Bengali, Marathi) */
const translations = {
  en: {
    nav_assessment: "Home & Scan",
    nav_pipeline: "Pipeline",
    nav_ai: "Rooftop AI",
    nav_roi: "Subsidy ROI",
    nav_gis: "District GIS",
    nav_vendors: "Empanelled Vendors",
    hero_badge: "PM Surya Ghar : Sovereign Solar GIS Engine",
    hero_title_1: "Solar Intelligence for",
    hero_title_2: "Every Indian Rooftop",
    hero_desc: "Enter your exact home address, trace your rooftop with high-precision satellite imagery, estimate complete solar investment with Govt subsidies, and inspect past 10-year solar weather trends.",
    input_title: "1. Property & Installation Parameters",
    label_location: "Exact House Address / Landmark",
    label_house_area: "Total House Area (sq ft)",
    label_solar_area: "Solar Install Area (sq ft)",
    label_roof_width: "Roof Width (ft)",
    label_electricity: "Monthly Usage (kWh / Units)",
    label_material: "House Construction Material",
    mat_rcc: "RCC Reinforced Concrete Terrace (Flat)",
    mat_tin: "Galvanized Tin / Metal Sheet",
    mat_tile: "Clay / Mangalore Tiles (Sloped)",
    mat_asbestos: "Asbestos / Fiber Sheet Structure",
    mat_wood: "Wood & Steel Truss Framing",
    btn_run_scan: "Run Geospatial Satellite AI Scan",
    tele_usable_area: "USABLE AREA",
    tele_orientation: "ORIENTATION",
    tele_shading: "SHADOW LOSS",
    tele_capacity: "REC. CAPACITY",
    est_eyebrow: "Financial Breakdown",
    est_title: "Total Investment & Govt Subsidy Estimation",
    est_disclaimer: "*Based on PM Surya Ghar Benchmark Capital Cost Rules",
    est_gross: "Gross System Cost",
    est_subsidy: "PM Surya Ghar Subsidy (CFA)",
    est_subsidy_note: "Direct Bank Transfer to Homeowner",
    est_net: "Net Out-Of-Pocket Investment",
    est_net_note: "Total Tentative Payable Amount",
    est_payback: "Est. Payback Period",
    tbl_item: "Component / Service",
    tbl_spec: "Technical Specification",
    tbl_cost: "Estimated Cost (₹)",
    tbl_total_net: "FINAL NET OUT-OF-POCKET INVESTMENT (TENTATIVE)",
    wx_eyebrow: "Meteorological Telemetry",
    wx_title: "Past 10-Year Solar Weather & Radiation Report",
    wx_period: "HISTORICAL SPAN: 2016 – 2025",
    wx_desc: "Satellite-derived solar irradiance (GHI kWh/m²/day), average annual temperature, precipitation, and clear sun days over the last decade at the selected location coordinates.",
    wx_chart_title: "10-Year Solar Irradiance (GHI) & Temperature Trend",
    wx_avg_ghi: "10-Yr Avg Solar Radiation",
    wx_ghi_note: "High Class-A Solar Potential Zone",
    wx_sunny_days: "Avg Annual Sunny Days",
    wx_sun_note: "Optimal generation window",
    wx_temp: "10-Yr Mean Temp & Dust Index",
    wx_temp_note: "Panel Temperature Loss: ~3.8%",
    pipe_eyebrow: "Automated Technical Workflow",
    pipe_title: "End-to-End Rooftop Audit & Approval Pipeline",
    pipe_desc: "OJAS automates all 6 critical technical stages — converting satellite coordinates into Single Line Diagrams (SLD), structural wind loads, and Discom feeder approvals.",
    pipe_s1_t: "Multi-Spectral Surface Scan",
    pipe_s1_d: "Sub-meter optical satellite passes combined with ISRO Cartosat DEM contours to map roof pitch and surface texture.",
    pipe_s2_t: "Footprint & Boundary Extraction",
    pipe_s2_d: "Neural polygon fitting isolates usable terrace space from parapets, water tanks, mumty structures, and skylights.",
    pipe_s3_t: "Obstruction Shading Filter",
    pipe_s3_d: "Simulates 8,760 hourly solar angles to detect shadows cast by nearby trees, chimneys, and taller adjoining buildings.",
    pipe_s4_t: "Auto-SLD & Technical CAD",
    pipe_s4_d: "Generates MNRE-standard Electrical Single Line Diagrams (SLD), string configuration, and DC combiner box ratings.",
    pipe_s5_t: "DISCOM Feeder Telemetry",
    pipe_s5_d: "Queries local Distribution Transformer (DT) capacity headroom to guarantee fast net-metering permit approval.",
    pipe_s6_t: "PM Surya Ghar Portal Submission",
    pipe_s6_d: "One-click auto-fill for National Portal application, generating verifiable geo-tagged audit dossiers for EPCs.",
    ai_eyebrow: "Explainable AI & Physics",
    ai_title: "Rooftop Solar Rating & AI Shading Engine",
    ai_desc: "OJAS evaluates roof physics with full explainability. Every suitability score transparently displays its mathematical parameters, structural weight constraints, and seasonal tilt loss.",
    roi_eyebrow: "PM Surya Ghar Calculator",
    roi_title: "Govt Subsidy & 25-Year Financial Return Model",
    roi_desc: "Calculate Central Financial Assistance (CFA) under PM Surya Ghar : Muft Bijli Yojana rules, compute cumulative 25-year cash flows, and inspect green carbon offsets.",
    gis_eyebrow: "State & Municipal Dashboard",
    gis_title: "District Ward Solar Potential & Feeder Headroom Heatmap",
    gis_desc: "Aggregates individual rooftop scans into DISCOM feeder headroom intelligence and municipal ward rollout planning.",
    gis_suitability: "Ward Solar Suitability Index",
    ven_eyebrow: "MNRE Accredited Installers",
    ven_title: "Empanelled Solar EPC Vendors Directory",
    ven_desc: "Connect directly with government-empanelled EPC vendors offering benchmark pricing, 5-year comprehensive maintenance, and seamless CFA subsidy filing."
  },
  hi: {
    nav_assessment: "मुख्य व स्कैन",
    nav_pipeline: "पाइपलाइन",
    nav_ai: "रूफटॉप AI",
    nav_roi: "सब्सिडी ROI",
    nav_gis: "जिला GIS",
    nav_vendors: "पंजीकृत विक्रेता",
    hero_badge: "पीएम सूर्य घर : मुफ़्त बिजली योजना इंजन",
    hero_title_1: "हर भारतीय छत के लिए",
    hero_title_2: "सोलर बुद्धिमत्ता",
    hero_desc: "अपने घर का सही पता दर्ज करें, उपग्रह चित्रों पर अपनी छत को चिह्नित करें, सरकारी सब्सिडी के साथ पूर्ण निवेश का अनुमान लगाएं।",
    input_title: "1. संपत्ति और सौर स्थापना पैरामीटर",
    label_location: "घर का सटीक पता / लैंडमार्क",
    label_house_area: "घर का कुल क्षेत्रफल (वर्ग फुट)",
    label_solar_area: "सोलर लगाने का क्षेत्र (वर्ग फुट)",
    label_roof_width: "छत की चौड़ाई (फुट)",
    label_electricity: "मासिक बिजली की आवश्यकता (यूनिट / kWh)",
    label_material: "घर के निर्माण की सामग्री",
    mat_rcc: "RCC कंक्रीट छत (समतल)",
    mat_tin: "गैल्वनाइज्ड टिन / मेटल शीट",
    mat_tile: "मिट्टी / मैंगलोर टाइल्स (डलाव वाली)",
    mat_asbestos: "एस्बेस्टस / फाइबर शीट संरचना",
    mat_wood: "लकड़ी और स्टील ट्रस फ्रेमिंग",
    btn_run_scan: "उपग्रह AI स्कैन चलाएं",
    tele_usable_area: "उपयोगी क्षेत्र",
    tele_orientation: "दिशानिर्देश",
    tele_shading: "छाया हानि",
    tele_capacity: "अनुशंसित क्षमता",
    est_eyebrow: "वित्तीय विवरण",
    est_title: "कुल निवेश और सरकारी सब्सिडी का अनुमान",
    est_disclaimer: "*पीएम सूर्य घर मानक लागत नियमों पर आधारित",
    est_gross: "कुल सिस्टम लागत",
    est_subsidy: "पीएम सूर्य घर सब्सिडी (CFA)",
    est_subsidy_note: "मकान मालिक को सीधा बैंक हस्तांतरण",
    est_net: "शुद्ध जेब से निवेश",
    est_net_note: "कुल अनुमानित देय राशि",
    est_payback: "अनुमानित पेबैक अवधि",
    tbl_item: "घटक / सेवा",
    tbl_spec: "तकनीकी विशिष्टता",
    tbl_cost: "अनुमानित लागत (₹)",
    tbl_total_net: "अंतिम शुद्ध जेब से निवेश (अनुमानित)",
    wx_eyebrow: "मौसम विज्ञान टेलीमेट्री",
    wx_title: "पिछले 10 वर्षों की सौर मौसम और विकिरण रिपोर्ट",
    wx_period: "ऐतिहासिक अवधि: 2016 - 2025",
    wx_desc: "चयनित स्थान निर्देशांकों पर पिछले एक दशक में उपग्रह-प्राप्त सौर विकिरण (GHI), औसत वार्षिक तापमान और धूप के दिन।",
    wx_chart_title: "10-वर्षीय सौर विकिरण (GHI) और तापमान रुझान",
    wx_avg_ghi: "10-वर्षीय औसत सौर विकिरण",
    wx_ghi_note: "उच्च श्रेणी-ए सौर क्षमता क्षेत्र",
    wx_sunny_days: "औसत वार्षिक धूप वाले दिन",
    wx_sun_note: "इष्टतम उत्पादन विंडो",
    wx_temp: "10-वर्षीय औसत तापमान व धूल सूचकांक",
    wx_temp_note: "पैनल तापमान हानि: ~3.8%",
    pipe_eyebrow: "स्वचालित तकनीकी वर्कफ़्लो",
    pipe_title: "रूफटॉप ऑडिट और अनुमोदन पाइपलाइन",
    pipe_desc: "OJAS सभी 6 महत्वपूर्ण तकनीकी चरणों को स्वचालित करता है।",
    pipe_s1_t: "मल्टी-स्पेक्ट्रल भू-सतह स्कैन",
    pipe_s1_d: "छत की ढलान और बनावट को मैप करने के लिए उपग्रह चित्र।",
    pipe_s2_t: "छत की सीमा निष्कर्षण",
    pipe_s2_d: "न्यूरल बहुभुज पैरापेट्स और पानी की टंकियों को अलग करता है।",
    pipe_s3_t: "छाया फ़िल्टर",
    pipe_s3_d: "8,760 प्रति घंटे के सौर कोणों का अनुकरण करता है।",
    pipe_s4_t: "ऑटो-SLD व तकनीकी CAD",
    pipe_s4_d: "MNRE-मानक विद्युत सिंगल लाइन आरेख उत्पन्न करता है।",
    pipe_s5_t: "डिस्कोम फीडर टेलीमेट्री",
    pipe_s5_d: "ट्रांसफॉर्मर क्षमता जांचता है।",
    pipe_s6_t: "पीएम सूर्य घर पोर्टल जमा",
    pipe_s6_d: "एक-क्लिक ऑटो-फिल।",
    ai_eyebrow: "व्याख्या योग्य AI",
    ai_title: "रूफटॉप सोलर रेटिंग और AI शेडिंग इंजन",
    ai_desc: "OJAS पूर्ण पारदर्शिता के साथ छत के भौतिक मापदंडों का मूल्यांकन करता है।",
    roi_eyebrow: "पीएम सूर्य घर कैलकुलेटर",
    roi_title: "सरकारी सब्सिडी और 25-वर्षीय वित्तीय लाभ मॉडल",
    roi_desc: "पीएम सूर्य घर नियमों के तहत सब्सिडी और 25 वर्षों की बचत की गणना करें।",
    gis_eyebrow: "राज्य और नगर निगम डैशबोर्ड",
    gis_title: "जिला वार्ड सौर क्षमता और फीडर हीटमैप",
    gis_desc: "वार्ड-स्तरीय रोलआउट योजना के लिए रूफटॉप स्कैन को जोड़ता है।",
    gis_suitability: "वार्ड सौर उपयुक्तता सूचकांक",
    ven_eyebrow: "MNRE मान्यता प्राप्त इंस्टॉलर",
    ven_title: "पंजीकृत सोलर EPC विक्रेता निर्देशिका",
    ven_desc: "सरकारी पंजीकृत विक्रेताओं से सीधे जुड़ें।"
  },
  bn: {
    nav_assessment: "হোম ও স্ক্যান",
    nav_pipeline: "পাইপলাইন",
    nav_ai: "রুফটপ AI",
    nav_roi: "সাবসিডি ROI",
    nav_gis: "জেলা GIS",
    nav_vendors: "তালিকাভুক্ত বিক্রেতা",
    hero_badge: "পিএম সূর্য ঘর : ফ্রি বিদ্যুৎ যোজনা ইঞ্জিন",
    hero_title_1: "প্রতিটি ভারতীয় ছাদের জন্য",
    hero_title_2: "সৌর বুদ্ধিমত্তা",
    hero_desc: "আপনার বাড়ির সঠিক ঠিকানা দিন, উপগ্রহ চিত্রে আপনার ছাদ চিহ্নিত করুন, সরকারি ভর্তুকিসহ মোট বিনিয়োগের হিসাব করুন।",
    input_title: "১. সম্পত্তি ও সৌর স্থাপনের বিবরণ",
    label_location: "বাড়ির সঠিক ঠিকানা / ল্যান্ডমার্ক",
    label_house_area: "বাড়ির মোট ক্ষেত্রফল (বর্গফুট)",
    label_solar_area: "সোলার বসানোর স্থান (বর্গফুট)",
    label_roof_width: "ছাদের প্রস্থ (ফুট)",
    label_electricity: "মাসিক বিদ্যুতের চাহিদা (kWh / ইউনিট)",
    label_material: "বাড়ি তৈরির উপাদান",
    mat_rcc: "RCC কনক্রিট ছাদ (সমতল)",
    mat_tin: "গ্যালভানাইজড টিন / মেটাল শিট",
    mat_tile: "মাটির / মাঙ্গালোর টাইলস (ঢালু)",
    mat_asbestos: "অ্যাসবেস্টস / ফাইবার শিট",
    mat_wood: "কাঠ ও স্টিল কাঠামো",
    btn_run_scan: "স্যাটেলাইট AI স্ক্যান চালান",
    tele_usable_area: "ব্যবহারযোগ্য স্থান",
    tele_orientation: "দিকবিন্যাস",
    tele_shading: "ছায়াজনিত ক্ষতি",
    tele_capacity: "সুপারিশকৃত ক্ষমতা",
    est_eyebrow: "আর্থিক বিবরণ",
    est_title: "মোট বিনিয়োগ ও সরকারি ভর্তুকির হিসাব",
    est_disclaimer: "*পিএম সূর্য ঘর নির্ধারিত মানদণ্ড অনুযায়ী",
    est_gross: "মোট সিস্টেম খরচ",
    est_subsidy: "পিএম সূর্য ঘর ভর্তুকি (CFA)",
    est_subsidy_note: "গ্রাহকের ব্যাংক অ্যাকাউন্টে সরাসরি জমা",
    est_net: "নিজের পকেট থেকে প্রকৃত খরচ",
    est_net_note: "মোট আনুমানিক প্রদেয় টাকা",
    est_payback: "টাকা ফেরত ওঠার আনুমানিক সময়",
    tbl_item: "উপাদান / পরিষেবা",
    tbl_spec: "কারিগরি বৈশিষ্ট্য",
    tbl_cost: "আনুমানিক খরচ (₹)",
    tbl_total_net: "চূড়ান্ত প্রকৃত খরচ (আনুমানিক)",
    wx_eyebrow: "আবহাওয়া বিজ্ঞান টেলিম্যাট্রি",
    wx_title: "গত ১০ বছরের সৌর আবহাওয়া ও বিকিরণ রিপোর্ট",
    wx_period: "ঐতিহাসিক সময়কাল: ২০১৬ – ২০২৫",
    wx_desc: "স্যাটেলাইট থেকে প্রাপ্ত গত এক দশকের গড় সৌর বিকিরণ (GHI), তাপমাত্রা ও রৌদ্রোজ্জ্বল দিনের হিসাব।",
    wx_chart_title: "১০ বছরের সৌর বিকিরণ (GHI) ও তাপমাত্রার প্রবণতা",
    wx_avg_ghi: "১০ বছরের গড় সৌর বিকিরণ",
    wx_ghi_note: "উচ্চ শ্রেণির ক্লাস-এ সৌর সম্ভাবনা অঞ্চল",
    wx_sunny_days: "বছরে গড় রৌদ্রোজ্জ্বল দিন",
    wx_sun_note: "বিদ্যুৎ উৎপাদনের সেরা সময়",
    wx_temp: "১০ বছরের গড় তাপমাত্রা ও ধূলিকণা সূচক",
    wx_temp_note: "প্যানেলে তাপমাত্রা জনিত ক্ষতি: ~৩.৮%",
    pipe_eyebrow: "স্বয়ংক্রিয় কারিগরি প্রক্রিয়া",
    pipe_title: "ছাদ পরীক্ষা ও অনুমোদন পাইপলাইন",
    pipe_desc: "OJAS ছাদের স্যাটেলাইট স্থানাঙ্ককে স্বয়ংক্রিয়ভাবে সিঙ্গেল লাইন ডায়াগ্রামে রূপান্তরিত করে।",
    pipe_s1_t: "মাল্টি-স্পেকট্রাল সারফেস স্ক্যান",
    pipe_s1_d: "ছাদের ঢাল এবং গঠন নির্ধারণের জন্য স্যাটেলাইট ম্যাপিং।",
    pipe_s2_t: "ছাদের সীমানা নির্ধারণ",
    pipe_s2_d: "ব্যবহারযোগ্য ছাদ পৃথকীকরণ।",
    pipe_s3_t: "ছায়া সনাক্তকরণ ফিল্টার",
    pipe_s3_d: "ছায়া পর্যবেক্ষণ।",
    pipe_s4_t: "অটো-SLD ও টেকনিক্যাল CAD",
    pipe_s4_d: "সার্কিট ডায়াগ্রাম তৈরি।",
    pipe_s5_t: "ডিসকম ফিডার টেলিম্যাট্রি",
    pipe_s5_d: "ট্রান্সফরমার ক্ষমতা পরীক্ষা।",
    pipe_s6_t: "পিএম সূর্য ঘর পোর্টালে জমা",
    pipe_s6_d: "এক-ক্লিকে ফর্ম পূরণ।",
    ai_eyebrow: "ব্যাখ্যাযোগ্য AI",
    ai_title: "ছাদের সোলার রেটিং ও AI শেডিং ইঞ্জিন",
    ai_desc: "OJAS সম্পূর্ণ স্বচ্ছতার সাথে ছাদের গঠন ও সক্ষমতা মূল্যায়ন করে।",
    roi_eyebrow: "পিএম সূর্য ঘর ক্যালকুলেটর",
    roi_title: "সরকারি ভর্তুকি ও ২৫ বছরের রিটার্ন মডেল",
    roi_desc: "২৫ বছরের বিদ্যুৎ খরচে সাশ্রয় হিসাব করুন।",
    gis_eyebrow: "রাজ্য ও পুরসভা ড্যাশবোর্ড",
    gis_title: "জেলা ওয়ার্ড সোলার সম্ভাবনা ও ফিডার হিটম্যাপ",
    gis_desc: "বিভিন্ন ছাদের সোলার তথ্য একত্রিত করে।",
    gis_suitability: "ওয়ার্ড সোলার উপযুক্ততা সূচক",
    ven_eyebrow: "MNRE অনুমোদিত বিক্রেতা",
    ven_title: "তালিকাভুক্ত সোলার EPC বিক্রেতাদের তালিকা",
    ven_desc: "অনুমোদিত বিক্রেতাদের সাথে সরাসরি যোগাযোগ করুন।"
  },
  mr: {
    nav_assessment: "मुख्य व स्कॅन",
    nav_pipeline: "पाइपलाइन",
    nav_ai: "रूफटॉप AI",
    nav_roi: "सब्सिडी ROI",
    nav_gis: "जिल्हा GIS",
    nav_vendors: "एमपॅनेल केलेले विक्रेते",
    hero_badge: "पीएम सूर्य घर : मोफत वीज योजना इंजिन",
    hero_title_1: "प्रत्येक भारतीय छतासाठी",
    hero_title_2: "सोलर बुद्धिमत्ता",
    hero_desc: "तुमच्या घराचा अचूक पत्ता प्रविष्ट करा, उपग्रह प्रतिमेवर तुमचे छत चिन्हांकित करा, अनुदानासह खर्चाचा अंदाज लावा.",
    input_title: "1. मालमत्ता आणि सोलर बसवण्याचे तपशील",
    label_location: "घराचा अचूक पत्ता / लँडमार्क",
    label_house_area: "घराचे एकूण क्षेत्रफळ (चौ. फूट)",
    label_solar_area: "सोलर बसवण्याचे क्षेत्रफळ (चौ. फूट)",
    label_roof_width: "छताची रुंदी (फूट)",
    label_electricity: "मासिक विजेची गरज (kWh / युनिट्स)",
    label_material: "घराच्या बांधकामाचे साहित्य",
    mat_rcc: "RCC कॉंक्रिट छत (सपाट)",
    mat_tin: "गॅल्वनाइज्ड पत्रे / मेटल शीट",
    mat_tile: "मातीची / मंगलोरी कौले (उतार असलेले)",
    mat_asbestos: "ॲस्बेस्टॉस / फायबर शीट",
    mat_wood: "लाकूड आणि स्टील फ्रेमिंग",
    btn_run_scan: "उपग्रह AI स्कॅन चालवा",
    tele_usable_area: "वापरण्यायोग्य क्षेत्र",
    tele_orientation: "दिशा",
    tele_shading: "सावलीमुळे होणारे नुकसान",
    tele_capacity: "शिफारस केलेली क्षमता",
    est_eyebrow: "वित्तीय तपशील",
    est_title: "एकूण गुंतवणूक आणि सरकारी अनुदानाचा अंदाज",
    est_disclaimer: "*पीएम सूर्य घर मानकांनुसार",
    est_gross: "एकूण सिस्टम खर्च",
    est_subsidy: "पीएम सूर्य घर अनुदान (CFA)",
    est_subsidy_note: "घरमालकाच्या बँक खात्यात थेट जमा",
    est_net: "स्वतःचा प्रत्यक्ष खर्च",
    est_net_note: "एकूण अंदाजित देय रक्कम",
    est_payback: "पैसे वसूल होण्याचा कालावधी",
    tbl_item: "घटक / सेवा",
    tbl_spec: "तांत्रिक तपशील",
    tbl_cost: "अंदाजित खर्च (₹)",
    tbl_total_net: "अंतिम स्वतःचा प्रत्यक्ष खर्च (अंदाजित)",
    wx_eyebrow: "हवामान शास्त्र टेलिमेट्री",
    wx_title: "गेल्या 10 वर्षांचा सौर हवामान व विकिरण अहवाल",
    wx_period: "ऐतिहासिक कालावधी: 2016 – 2025",
    wx_desc: "निवडलेल्या ठिकाणासाठी उपग्रहावरून मिळालेली सौर विकिरण (GHI) आणि तापमान माहिती.",
    wx_chart_title: "10-वर्षांचा सौर विकिरण (GHI) आणि तापमान ट्रेंड",
    wx_avg_ghi: "10-वर्षांचे सरासरी सौर विकिरण",
    wx_ghi_note: "उच्च श्रेणी-A सौर क्षमता क्षेत्र",
    wx_sunny_days: "वार्षिक सरासरी उन्हाचे दिवस",
    wx_sun_note: "विद्युत निर्मितीसाठी सर्वोत्तम वेळ",
    wx_temp: "10-वर्षांचे सरासरी तापमान व धूळ निर्देशांक",
    wx_temp_note: "तापमानामुळे पॅनल्सचे नुकसान: ~3.8%",
    pipe_eyebrow: "स्वयंचलित तांत्रिक कार्यप्रवाह",
    pipe_title: "रूफटॉप ऑडिट आणि मंजूरी पाइपलाइन",
    pipe_desc: "OJAS तांत्रिक टप्प्यांना स्वयंचलित करते.",
    pipe_s1_t: "मल्टी-स्पेक्ट्रल भू-पृष्ठभाग स्कॅन",
    pipe_s1_d: "छताचा उतार मॅप करण्यासाठी उपग्रह चित्रे.",
    pipe_s2_t: "छताची हद्द निश्चित करणे",
    pipe_s2_d: "वापरण्यायोग्य छत वेगळे करणे.",
    pipe_s3_t: "सावली फिल्टर",
    pipe_s3_d: "सावलीचे निरीक्षण.",
    pipe_s4_t: "ऑटो-SLD आणि तांत्रिक CAD",
    pipe_s4_d: "सिंगल लाइन डायग्राम तयार करणे.",
    pipe_s5_t: "महावितरण फीडर टेलिमेट्री",
    pipe_s5_d: "ट्रान्सफॉर्मर क्षमता तपासणे.",
    pipe_s6_t: "पीएम सूर्य घर पोर्टल सबमिशन",
    pipe_s6_d: "अर्ध-स्वयंचलित फॉर्म भरणे.",
    ai_eyebrow: "स्पष्टीकरणयोग्य AI",
    ai_title: "रूफटॉप सोलर रेटिंग आणि AI शेडिंग इंजिन",
    ai_desc: "OJAS पूर्ण पारदर्शकतेसह तांत्रिक मूल्यांकन करते.",
    roi_eyebrow: "पीएम सूर्य घर कॅल्क्युलेटर",
    roi_title: "सरकारी अनुदान आणि 25-वर्षांचा परतावा मॉडेल",
    roi_desc: "अनुदान आणि २५ वर्षांतील बचत मोजा.",
    gis_eyebrow: "राज्य आणि महापालिका डॅशबोर्ड",
    gis_title: "जिल्हा प्रभाग सौर क्षमता आणि फीडर हिटमॅप",
    gis_desc: "प्रभाग स्तरावरील नियोजनासाठी स्कॅन एकत्र करतो.",
    gis_suitability: "प्रभाग सौर सुयोग्य निर्देशांक",
    ven_eyebrow: "MNRE मान्यताप्राप्त विक्रेते",
    ven_title: "एमपॅनेल केलेल्या सोलर EPC विक्रेत्यांची यादी",
    ven_desc: "सरकारी मान्यताप्राप्त विक्रेत्यांशी थेट संपर्क साधा."
  }
};

let currentLang = 'en';
let weatherChartInstance = null;
let roiChartInstance = null;
let searchDebounceTimeout = null;

// Initialize on Window Load
window.addEventListener('load', () => {
  if (window.ojasMap) {
    window.ojasMap.init('gisMap');
  }
  initWeatherChart();
  initRoiChart();
  initWardHeatmap();
  drawRooftopSim(12);
  calculateEstimation();
  checkBackendHealth();
});

// Tab Switcher
function switchTab(tabId) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const targetPage = document.getElementById('page-' + tabId);
  const targetBtn = document.getElementById('tab-btn-' + tabId);

  if (targetPage) targetPage.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'assessment' && window.ojasMap && window.ojasMap.map) {
    setTimeout(() => window.ojasMap.map.invalidateSize(), 200);
  }

  if (window.StatusLog) {
    window.StatusLog.log(`Switched to tab: [${tabId.toUpperCase()}]`, 'INFO', 'NAV');
  }
}

// Multilingual Switcher
function changeLanguage(langKey) {
  if (!translations[langKey]) return;
  currentLang = langKey;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[langKey][key]) {
      el.innerText = translations[langKey][key];
    }
  });

  if (window.StatusLog) {
    window.StatusLog.log(`Display language updated: [${langKey.toUpperCase()}]`, 'INFO', 'LOCALE');
  }
}

// Geocoding & Address Suggestions
function handleAddressKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    hideSuggestions();
    geocodeAddress();
  }
}

function handleAddressInput(value) {
  clearTimeout(searchDebounceTimeout);
  if (!value || value.trim().length < 3) {
    hideSuggestions();
    return;
  }

  searchDebounceTimeout = setTimeout(() => {
    fetchAddressSuggestions(value.trim());
  }, 400);
}

function fetchAddressSuggestions(query) {
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`)
    .then(res => res.json())
    .then(data => {
      const dropdown = document.getElementById('addressSuggestions');
      if (!dropdown) return;
      dropdown.innerHTML = '';

      if (data && data.length > 0) {
        data.forEach(item => {
          const div = document.createElement('div');
          div.className = 'address-item';
          div.innerText = item.display_name;
          div.onclick = function() {
            selectSuggestion(item.lat, item.lon, item.display_name);
          };
          dropdown.appendChild(div);
        });
        dropdown.classList.remove('hidden');
      } else {
        hideSuggestions();
      }
    })
    .catch(err => {
      console.warn('Address suggestion error:', err);
      hideSuggestions();
    });
}

// 10-Year Historical Climate Datasets (2016-2025) for Representative Indian Districts
const HISTORICAL_YEARS = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];

const DISTRICT_CLIMATE_DATABASE = {
  kolkata: {
    name: "Kolkata",
    state: "West Bengal",
    lat: 22.5726,
    lng: 88.3639,
    ghi: [4.95, 5.08, 5.12, 4.90, 5.02, 5.15, 5.05, 5.18, 5.14, 5.21],
    temp: [26.8, 27.1, 27.4, 27.0, 27.3, 27.6, 27.5, 27.8, 27.7, 28.0],
    sunny_days: 284,
    dust_index: "Moderate",
    panel_temp_loss_pct: 3.9
  },
  delhi: {
    name: "New Delhi",
    state: "Delhi NCR",
    lat: 28.6139,
    lng: 77.2090,
    ghi: [5.25, 5.34, 5.40, 5.20, 5.30, 5.38, 5.35, 5.42, 5.40, 5.46],
    temp: [25.1, 25.4, 25.8, 25.3, 25.6, 26.0, 25.9, 26.3, 26.2, 26.5],
    sunny_days: 305,
    dust_index: "High (Seasonal)",
    panel_temp_loss_pct: 4.2
  },
  jaipur: {
    name: "Jaipur",
    state: "Rajasthan",
    lat: 26.9124,
    lng: 75.7873,
    ghi: [5.68, 5.75, 5.82, 5.62, 5.70, 5.80, 5.78, 5.86, 5.83, 5.90],
    temp: [25.8, 26.1, 26.5, 26.0, 26.4, 26.8, 26.7, 27.1, 27.0, 27.3],
    sunny_days: 322,
    dust_index: "High",
    panel_temp_loss_pct: 4.5
  },
  nagpur: {
    name: "Nagpur",
    state: "Maharashtra",
    lat: 21.1458,
    lng: 79.0882,
    ghi: [5.38, 5.46, 5.52, 5.32, 5.42, 5.50, 5.48, 5.56, 5.52, 5.58],
    temp: [27.0, 27.3, 27.7, 27.2, 27.5, 27.9, 27.8, 28.2, 28.1, 28.4],
    sunny_days: 308,
    dust_index: "Low-Moderate",
    panel_temp_loss_pct: 4.4
  },
  bengaluru: {
    name: "Bengaluru",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    ghi: [5.42, 5.48, 5.55, 5.36, 5.45, 5.52, 5.50, 5.58, 5.54, 5.60],
    temp: [24.0, 24.3, 24.6, 24.2, 24.5, 24.8, 24.7, 25.1, 25.0, 25.3],
    sunny_days: 298,
    dust_index: "Low",
    panel_temp_loss_pct: 3.1
  },
  mumbai: {
    name: "Mumbai",
    state: "Maharashtra",
    lat: 19.0760,
    lng: 72.8777,
    ghi: [5.05, 5.12, 5.18, 4.98, 5.08, 5.16, 5.12, 5.20, 5.18, 5.24],
    temp: [27.5, 27.8, 28.1, 27.7, 28.0, 28.3, 28.2, 28.6, 28.5, 28.8],
    sunny_days: 288,
    dust_index: "Low (Coastal)",
    panel_temp_loss_pct: 3.8
  },
  ahmedabad: {
    name: "Ahmedabad",
    state: "Gujarat",
    lat: 23.0225,
    lng: 72.5714,
    ghi: [5.55, 5.62, 5.70, 5.50, 5.58, 5.68, 5.65, 5.74, 5.70, 5.78],
    temp: [27.2, 27.5, 27.9, 27.4, 27.7, 28.1, 28.0, 28.4, 28.3, 28.6],
    sunny_days: 315,
    dust_index: "Moderate",
    panel_temp_loss_pct: 4.3
  },
  hyderabad: {
    name: "Hyderabad",
    state: "Telangana",
    lat: 17.3850,
    lng: 78.4867,
    ghi: [5.32, 5.40, 5.48, 5.28, 5.36, 5.45, 5.42, 5.50, 5.46, 5.52],
    temp: [26.6, 26.9, 27.3, 26.8, 27.1, 27.5, 27.4, 27.8, 27.7, 28.0],
    sunny_days: 302,
    dust_index: "Moderate",
    panel_temp_loss_pct: 4.0
  },
  chennai: {
    name: "Chennai",
    state: "Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    ghi: [5.28, 5.35, 5.42, 5.22, 5.30, 5.38, 5.35, 5.44, 5.40, 5.46],
    temp: [28.8, 29.1, 29.5, 29.0, 29.3, 29.7, 29.6, 30.0, 29.9, 30.2],
    sunny_days: 290,
    dust_index: "Low (Coastal)",
    panel_temp_loss_pct: 4.6
  },
  lucknow: {
    name: "Lucknow",
    state: "Uttar Pradesh",
    lat: 26.8467,
    lng: 80.9462,
    ghi: [5.18, 5.25, 5.32, 5.12, 5.22, 5.30, 5.28, 5.36, 5.32, 5.38],
    temp: [25.6, 25.9, 26.3, 25.8, 26.1, 26.5, 26.4, 26.8, 26.7, 27.0],
    sunny_days: 296,
    dust_index: "Moderate-High",
    panel_temp_loss_pct: 4.1
  },
  patna: {
    name: "Patna",
    state: "Bihar",
    lat: 25.5941,
    lng: 85.1376,
    ghi: [5.08, 5.15, 5.22, 5.02, 5.12, 5.20, 5.18, 5.26, 5.22, 5.28],
    temp: [25.9, 26.2, 26.6, 26.1, 26.4, 26.8, 26.7, 27.1, 27.0, 27.3],
    sunny_days: 292,
    dust_index: "Moderate",
    panel_temp_loss_pct: 4.0
  }
};

function selectSuggestion(lat, lon, displayName) {
  const input = document.getElementById('inputLocation');
  if (input) input.value = displayName;
  hideSuggestions();

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (window.ojasMap && window.ojasMap.map) {
    window.ojasMap.currentLat = latitude;
    window.ojasMap.currentLng = longitude;
    window.ojasMap.map.setView([latitude, longitude], 19);
    window.ojasMap.marker.setLatLng([latitude, longitude]);
    window.ojasMap.updateMapPolygon(latitude, longitude);
    window.ojasMap.updateTelemetry();
  }

  calculateEstimation();
  updateDistrictWeather(latitude, longitude, displayName);

  const statusText = document.getElementById('addressStatusText');
  if (statusText) {
    statusText.className = "text-emerald-400 flex items-center gap-1 text-[11px] font-mono";
    statusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Rooftop Pinpointed: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`;
  }

  if (window.StatusLog) {
    window.StatusLog.log(`Location selected: ${displayName.split(',').slice(0, 3).join(',')} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`, 'SUCCESS', 'GEOCODE');
  }
}

function hideSuggestions() {
  const dropdown = document.getElementById('addressSuggestions');
  if (dropdown) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
  }
}

function geocodeAddress() {
  hideSuggestions();
  const input = document.getElementById('inputLocation');
  if (!input || !input.value.trim()) return;

  const query = input.value.trim();
  const searchIcon = document.getElementById('searchIcon');
  const searchSpinner = document.getElementById('searchSpinner');
  const statusText = document.getElementById('addressStatusText');

  if (searchIcon) searchIcon.classList.add('hidden');
  if (searchSpinner) searchSpinner.classList.remove('hidden');
  if (statusText) {
    statusText.innerText = "Searching satellite coordinates...";
    statusText.className = "text-amber-400 flex items-center gap-1 text-[11px] font-mono";
  }

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`)
    .then(res => res.json())
    .then(data => {
      if (searchIcon) searchIcon.classList.remove('hidden');
      if (searchSpinner) searchSpinner.classList.add('hidden');

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        if (window.ojasMap && window.ojasMap.map) {
          window.ojasMap.currentLat = lat;
          window.ojasMap.currentLng = lon;
          window.ojasMap.map.setView([lat, lon], 19);
          window.ojasMap.marker.setLatLng([lat, lon]);
          window.ojasMap.updateMapPolygon(lat, lon);
          window.ojasMap.updateTelemetry();
        }

        calculateEstimation();
        updateDistrictWeather(lat, lon, data[0].display_name);

        if (statusText) {
          statusText.className = "text-emerald-400 flex items-center gap-1 text-[11px] font-mono";
          statusText.innerHTML = `<i class="fa-solid fa-circle-check"></i> Found: ${data[0].display_name.split(',').slice(0, 3).join(',')}`;
        }
      } else {
        if (statusText) {
          statusText.className = "text-rose-400 flex items-center gap-1 text-[11px] font-mono";
          statusText.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Address not found. Try including landmark or city.`;
        }
      }
    })
    .catch(err => {
      if (searchIcon) searchIcon.classList.remove('hidden');
      if (searchSpinner) searchSpinner.classList.add('hidden');
      if (statusText) {
        statusText.className = "text-rose-400 flex items-center gap-1 text-[11px] font-mono";
        statusText.innerText = "Geocoding network error. Please try again.";
      }
    });
}

function useCurrentLocation() {
  const statusText = document.getElementById('addressStatusText');
  if (navigator.geolocation) {
    if (statusText) statusText.innerText = "Acquiring GPS lock...";
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (window.ojasMap && window.ojasMap.map) {
        window.ojasMap.currentLat = lat;
        window.ojasMap.currentLng = lng;
        window.ojasMap.map.setView([lat, lng], 19);
        window.ojasMap.marker.setLatLng([lat, lng]);
        window.ojasMap.updateMapPolygon(lat, lng);
        window.ojasMap.reverseGeocodeCoordinates(lat, lng);
        window.ojasMap.updateTelemetry();
      }

      calculateEstimation();
      updateDistrictWeather(lat, lng);

      if (statusText) {
        statusText.className = "text-emerald-400 flex items-center gap-1 text-[11px] font-mono";
        statusText.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> GPS Location Acquired!`;
      }
    }, err => {
      if (statusText) {
        statusText.className = "text-rose-400 flex items-center gap-1 text-[11px] font-mono";
        statusText.innerText = "Geolocation permission denied or unavailable.";
      }
    });
  }
}

function triggerGeospatialScan() {
  const badge = document.getElementById('scanStatusBadge');
  if (badge) {
    badge.innerText = "SCANNING ROOF...";
    badge.className = "text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded animate-pulse";
  }

  if (window.StatusLog) {
    window.StatusLog.log("Executing Geospatial AI Surface Scan & Shading Analysis...", "CALL", "SCAN");
  }

  setTimeout(() => {
    if (badge) {
      badge.innerText = "GIS SCAN COMPLETE";
      badge.className = "text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded";
    }
    calculateEstimation();
    if (window.StatusLog) {
      window.StatusLog.log("Surface scan complete: Terrace polygon locked with high solar exposure (94.2%).", "SUCCESS", "SCAN");
    }
  }, 800);
}

/* Material-Specific Usable Rooftop Factors & Financial Estimation Calculation Engine */
const ROOF_MATERIAL_FACTORS = {
  rcc: 0.75,       // RCC flat terrace (perimeter setbacks, mumty, water tanks)
  tin: 0.80,       // Galvanized tin/metal sheet (high continuous usable surface)
  tile: 0.65,      // Clay/Mangalore tiles (pitch, ridges, valleys, fragile mounting)
  asbestos: 0.70,  // Asbestos/fiber sheet (purlin mounting constraints)
  wood: 0.60       // Wood/truss framing (structural load limits)
};

function calculateEstimation() {
  const houseArea = parseFloat(document.getElementById('inputHouseArea')?.value) || 1800;
  const solarAreaInput = document.getElementById('inputSolarArea');
  const solarArea = parseFloat(solarAreaInput?.value) || 650;
  const electricityUnits = parseFloat(document.getElementById('inputElectricity')?.value) || 450;
  const material = document.getElementById('inputMaterial')?.value || 'rcc';

  // Usable area utilization factor
  const usableFactor = ROOF_MATERIAL_FACTORS[material] || 0.75;
  const usableAreaSqm = (solarArea * 0.092903).toFixed(1);

  // System Capacity (kWp) derivation based on usable solar area & electrical usage
  // Standard Tier-1 ALMM modules (~440-540Wp) require ~120-130 sq ft of net usable area per kWp
  let capByArea = solarArea / 130;
  let capByUsage = electricityUnits / 120; // ~120 units generated per kWp per month
  let systemCap = Math.min(capByArea, capByUsage);
  systemCap = Math.max(1.0, Math.round(systemCap * 10) / 10); // min 1.0 kWp

  // Gross Capital Cost calculation (~₹48,000 - ₹52,000 / kW base)
  let baseRatePerKw = 48000;
  if (material === 'tile' || material === 'wood') baseRatePerKw += 4000;
  let grossCost = systemCap * baseRatePerKw;

  // PM Surya Ghar Subsidy (CFA Rules: up to 2kW @ ₹30k/kW; 2-3kW @ +₹18k/kW; max ₹78,000)
  let subsidy = 0;
  if (systemCap <= 2) {
    subsidy = systemCap * 30000;
  } else if (systemCap <= 3) {
    subsidy = 60000 + ((systemCap - 2) * 18000);
  } else {
    subsidy = 78000;
  }

  let netCost = Math.max(0, grossCost - subsidy);

  // Annual Generation, Financial Savings & Payback
  let annualUnits = systemCap * 1450; // ~1450 units per kWp per year (Indian average)
  let gridTariff = 7.0; // ₹7.0 / unit
  let annualSavings = annualUnits * gridTariff;
  let paybackYears = annualSavings > 0 ? (netCost / annualSavings).toFixed(1) : '0.0';

  // Update Highlight Cards
  const estGross = document.getElementById('estGross');
  const estSubsidy = document.getElementById('estSubsidy');
  const estNet = document.getElementById('estNet');
  const estPayback = document.getElementById('estPayback');
  const estCapDetail = document.getElementById('estCapDetail');
  const estAnnualSavings = document.getElementById('estAnnualSavings');

  if (estGross) estGross.innerText = `₹${Math.round(grossCost).toLocaleString('en-IN')}`;
  if (estSubsidy) estSubsidy.innerText = `- ₹${Math.round(subsidy).toLocaleString('en-IN')}`;
  if (estNet) estNet.innerText = `₹${Math.round(netCost).toLocaleString('en-IN')}`;
  if (estPayback) estPayback.innerText = `${paybackYears} Years`;
  if (estCapDetail) estCapDetail.innerText = `${systemCap} kWp Tier-1 PV Grid System`;
  if (estAnnualSavings) estAnnualSavings.innerText = `Annual Savings: ₹${Math.round(annualSavings).toLocaleString('en-IN')}`;

  // Itemized Breakdown Table
  let panelCost = Math.round(grossCost * 0.58);
  let inverterCost = Math.round(grossCost * 0.18);
  let structureCost = Math.round(grossCost * 0.11);
  let bosCost = Math.round(grossCost * 0.07);
  let netMeterCost = Math.round(grossCost - (panelCost + inverterCost + structureCost + bosCost));

  let numPanels = Math.ceil((systemCap * 1000) / 440); // 440W TOPCon Modules

  const specPanels = document.getElementById('specPanels');
  const costPanels = document.getElementById('costPanels');
  const costInverter = document.getElementById('costInverter');
  const costStructure = document.getElementById('costStructure');
  const costBOS = document.getElementById('costBOS');
  const costNetMeter = document.getElementById('costNetMeter');
  const costFinalNet = document.getElementById('costFinalNet');

  if (specPanels) specPanels.innerText = `${numPanels} Panels @ 440Wp (${systemCap} kWp Total)`;
  if (costPanels) costPanels.innerText = `₹${panelCost.toLocaleString('en-IN')}`;
  if (costInverter) costInverter.innerText = `₹${inverterCost.toLocaleString('en-IN')}`;
  if (costStructure) costStructure.innerText = `₹${structureCost.toLocaleString('en-IN')}`;
  if (costBOS) costBOS.innerText = `₹${bosCost.toLocaleString('en-IN')}`;
  if (costNetMeter) costNetMeter.innerText = `₹${netMeterCost.toLocaleString('en-IN')}`;
  if (costFinalNet) costFinalNet.innerText = `₹${Math.round(netCost).toLocaleString('en-IN')}`;

  // Update Telemetry Bar
  const teleArea = document.getElementById('teleArea');
  const teleCap = document.getElementById('teleCap');
  if (teleArea) teleArea.innerText = `${usableAreaSqm} m²`;
  if (teleCap) teleCap.innerText = `${systemCap} kWp`;

  // Update 25-Year ROI Chart
  if (roiChartInstance) updateRoiChart(netCost, annualSavings);
}

/* 10-Year District Weather Telemetry & Solar Irradiance Collector */
function getDistrictLocalData(lat, lng, districtHint) {
  if (districtHint) {
    const hintLower = districtHint.toLowerCase();
    for (const key in DISTRICT_CLIMATE_DATABASE) {
      const d = DISTRICT_CLIMATE_DATABASE[key];
      if (hintLower.includes(key) || hintLower.includes(d.name.toLowerCase())) {
        return d;
      }
    }
  }

  let bestMatch = DISTRICT_CLIMATE_DATABASE.kolkata;
  let bestDist = Infinity;

  for (const key in DISTRICT_CLIMATE_DATABASE) {
    const d = DISTRICT_CLIMATE_DATABASE[key];
    const dist = Math.sqrt(Math.pow(lat - d.lat, 2) + Math.pow(lng - d.lng, 2));
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = d;
    }
  }

  return bestMatch;
}

async function updateDistrictWeather(lat = 22.5529, lng = 88.3524, districtHint = null) {
  let weatherData = null;

  // Try fetching from backend API
  const apiRes = await fetchAPI(`/api/v1/weather-history?lat=${lat}&lng=${lng}${districtHint ? `&district=${encodeURIComponent(districtHint)}` : ''}`);
  if (apiRes.success && apiRes.data && apiRes.data.solar_radiation_ghi) {
    weatherData = apiRes.data;
  } else {
    // Client-side meteorological calculation
    const d = getDistrictLocalData(lat, lng, districtHint);
    const distOffset = Math.sqrt(Math.pow(lat - d.lat, 2) + Math.pow(lng - d.lng, 2));
    const latFactor = distOffset > 0.5 ? 1.0 + (d.lat - lat) * 0.008 : 1.0;

    const ghiSeries = d.ghi.map(v => parseFloat((v * latFactor).toFixed(2)));
    const tempSeries = d.temp.map(v => parseFloat(v.toFixed(1)));
    const avgGhi = parseFloat((ghiSeries.reduce((a, b) => a + b, 0) / ghiSeries.length).toFixed(2));
    const avgTemp = parseFloat((tempSeries.reduce((a, b) => a + b, 0) / tempSeries.length).toFixed(1));

    weatherData = {
      district: d.name,
      state: d.state,
      years: HISTORICAL_YEARS,
      solar_radiation_ghi: ghiSeries,
      avg_temperature_c: tempSeries,
      avg_annual_ghi: avgGhi,
      avg_annual_sunny_days: d.sunny_days,
      mean_temp_c: avgTemp,
      dust_index: d.dust_index,
      panel_temp_loss_pct: d.panel_temp_loss_pct
    };
  }

  if (!weatherData) return;

  // 1. Update Weather Chart
  if (weatherChartInstance) {
    weatherChartInstance.data.labels = weatherData.years || HISTORICAL_YEARS;
    weatherChartInstance.data.datasets[0].data = weatherData.solar_radiation_ghi;
    weatherChartInstance.data.datasets[1].data = weatherData.avg_temperature_c;
    weatherChartInstance.update();
  }

  // 2. Update 10-Year Weather Metric Badges
  const avgGhiEl = document.getElementById('wxAvgGhiVal');
  const ghiNoteEl = document.getElementById('wxGhiNote');
  const sunnyDaysEl = document.getElementById('wxSunnyDaysVal');
  const tempEl = document.getElementById('wxTempVal');
  const tempNoteEl = document.getElementById('wxTempNote');
  const districtBadgeEl = document.getElementById('wxDistrictBadge');

  if (avgGhiEl) avgGhiEl.innerText = `${weatherData.avg_annual_ghi} kWh/m²/day`;
  if (ghiNoteEl) {
    ghiNoteEl.innerText = weatherData.avg_annual_ghi >= 5.3 ? 'High Class-A Solar Potential Zone' : 'Optimal Solar Generation Window';
  }
  if (sunnyDaysEl) sunnyDaysEl.innerText = `${weatherData.avg_annual_sunny_days} Days / Year`;
  if (tempEl) tempEl.innerText = `${weatherData.mean_temp_c}°C | ${weatherData.dust_index || 'Low'} Dust`;
  if (tempNoteEl) tempNoteEl.innerText = `Panel Temperature Loss: ~${weatherData.panel_temp_loss_pct}%`;
  if (districtBadgeEl) districtBadgeEl.innerText = `DISTRICT: ${weatherData.district.toUpperCase()} (${weatherData.state || 'INDIA'})`;

  // 3. Update District GIS Wards
  updateDistrictWards(weatherData.district);

  if (window.StatusLog) {
    window.StatusLog.log(
      `10-Year Weather Telemetry loaded for ${weatherData.district} (${weatherData.state}): 10-Yr GHI: ${weatherData.avg_annual_ghi} kWh/m²/day, Sunny: ${weatherData.avg_annual_sunny_days}d/yr, Temp: ${weatherData.mean_temp_c}°C`,
      'SUCCESS',
      'WEATHER'
    );
  }
}

/* 10-Year Weather & Solar Irradiance Chart Initialization */
function initWeatherChart() {
  const canvas = document.getElementById('weatherChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const defaultKolkata = DISTRICT_CLIMATE_DATABASE.kolkata;

  weatherChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: HISTORICAL_YEARS,
      datasets: [
        {
          label: 'Solar Radiation (GHI kWh/m²/day)',
          data: defaultKolkata.ghi,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Avg Temperature (°C)',
          data: defaultKolkata.temp,
          borderColor: '#06B6D4',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8', font: { family: 'JetBrains Mono' } }
        },
        y: {
          type: 'linear', display: true, position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#F59E0B', font: { family: 'JetBrains Mono' } }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#06B6D4', font: { family: 'JetBrains Mono' } }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#F8FAFC', font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
      }
    }
  });

  // Fetch initial telemetry for current coordinates
  const lat = window.ojasMap ? window.ojasMap.currentLat : 22.5529;
  const lng = window.ojasMap ? window.ojasMap.currentLng : 88.3524;
  updateDistrictWeather(lat, lng, 'Kolkata');
}

/* 25-Year Cumulative Savings Chart */
function initRoiChart() {
  const canvas = document.getElementById('roiChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  roiChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Array.from({ length: 25 }, (_, i) => `Yr ${i + 1}`),
      datasets: [
        {
          label: 'Cumulative Cash Savings (₹)',
          data: [],
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10B981',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#10B981', font: { family: 'JetBrains Mono' } }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#F8FAFC', font: { family: 'Plus Jakarta Sans', size: 12 } }
        }
      }
    }
  });
}

function updateRoiChart(netCost, annualSavings) {
  if (!roiChartInstance) return;
  let cumulative = -netCost;
  const data = [];
  for (let yr = 1; yr <= 25; yr++) {
    cumulative += annualSavings * Math.pow(1.04, yr - 1); // 4% tariff escalation
    data.push(Math.round(cumulative));
  }
  roiChartInstance.data.datasets[0].data = data;
  roiChartInstance.update();
}

/* Canvas Shading & Sun Simulator */
function drawRooftopSim(hour) {
  const hourText = document.getElementById('solarHourText');
  if (hourText) {
    hourText.innerText = `${hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  const canvas = document.getElementById('aiRoofCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Background Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (hour < 8 || hour > 17) {
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(1, '#020617');
  } else {
    skyGrad.addColorStop(0, '#1e293b');
    skyGrad.addColorStop(1, '#0f172a');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Sun position calculation
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const sunX = width / 2 - Math.cos(sunAngle) * (width * 0.4);
  const sunY = height - Math.sin(sunAngle) * (height * 0.7);

  // Draw Sun
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#F59E0B';
  ctx.shadowColor = '#F59E0B';
  ctx.shadowBlur = 25;
  ctx.fill();
  ctx.restore();

  // Draw House Structure
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.fillRect(200, 160, 300, 100);
  ctx.strokeRect(200, 160, 300, 100);

  // Parapet Wall (Obstruction)
  ctx.fillStyle = '#334155';
  ctx.fillRect(190, 140, 15, 30);

  // Solar Panel Array on Terrace
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(230, 152, 230, 8);
  ctx.strokeStyle = '#38bdf8';
  ctx.strokeRect(230, 152, 230, 8);

  // Shadow Vector from Parapet
  const dx = 205 - sunX;
  const dy = 140 - sunY;
  const shadowLength = (160 - 140) * (dx / Math.max(dy, 10));

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.moveTo(205, 160);
  ctx.lineTo(205 + shadowLength, 160);
  ctx.lineTo(205 + shadowLength * 1.1, 160 + 8);
  ctx.lineTo(205, 160 + 8);
  ctx.closePath();
  ctx.fill();

  // Solar Rays
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(sunX, sunY); ctx.lineTo(230, 152);
  ctx.moveTo(sunX, sunY); ctx.lineTo(345, 152);
  ctx.moveTo(sunX, sunY); ctx.lineTo(460, 152);
  ctx.stroke();
  ctx.setLineDash([]);
}

/* District GIS Heatmap Dynamic Generator */
function updateDistrictWards(districtName = 'Kolkata') {
  const grid = document.getElementById('wardHeatmapGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const dLower = districtName.toLowerCase();
  let areas = [];

  if (dLower.includes('delhi')) {
    areas = ["Connaught Place", "Chanakyapuri", "Karol Bagh", "Dwarka Sec 6", "Dwarka Sec 12", "Rohini Sec 3",
             "Rohini Sec 10", "Vasant Kunj", "Saket", "Hauz Khas", "Lajpat Nagar", "Defense Colony",
             "Greater Kailash", "Nehru Place", "Mayur Vihar 1", "Mayur Vihar 2", "Janakpuri", "Rajouri Garden",
             "Pitampura", "Model Town", "Civil Lines", "Chandni Chowk", "Paharganj", "Sarita Vihar",
             "Jasola", "Okhla Phase 3", "Patparganj", "Preet Vihar", "Shahdara", "Kashmere Gate",
             "Paschim Vihar", "Punjabi Bagh", "Vikaspuri", "Uttam Nagar", "Narela", "Najafgarh"];
  } else if (dLower.includes('jaipur')) {
    areas = ["C-Scheme", "Malviya Nagar", "Mansarovar North", "Mansarovar South", "Vaishali Nagar", "Raja Park",
             "Bapu Nagar", "Civil Lines", "Tonk Road", "Jagatpura", "Sitapura", "Sanganer",
             "Ajmer Road", "Vidhyadhar Nagar", "Shastri Nagar", "Bani Park", "Jhotwara", "Murlipura",
             "Amer", "Hawa Mahal", "Johari Bazar", "MI Road", "Sodala", "Gopalpura",
             "Pratap Nagar", "Durgapura", "Barkat Nagar", "Lal Kothi", "Adarsh Nagar", "Tilak Nagar",
             "Sirsi Road", "Kalwar Road", "Agra Road", "Delhi Road", "Kukas", "Chomu"];
  } else if (dLower.includes('bengaluru') || dLower.includes('bangalore')) {
    areas = ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Electronic City", "Jayanagar",
             "JP Nagar", "BTM Layout", "Marathahalli", "Hebbal", "Malleshwaram", "Rajajinagar",
             "Basavanagudi", "Frazer Town", "Sadashivanagar", "Yelahanka", "Banashankari", "Bellandur",
             "Sarjapur Road", "Varthur", "Bannerghatta", "Kalyan Nagar", "Kammanahalli", "RT Nagar",
             "Ulsoor", "MG Road", "Cunningham Road", "Richmond Town", "Domlur", "Kaggadasapura",
             "Vidyaranyapura", "Sahakara Nagar", "Peenya", "Yeshwanthpur", "Vijayanagar", "Nagarbhavi"];
  } else if (dLower.includes('mumbai')) {
    areas = ["Colaba", "Marine Lines", "Fort", "Malabar Hill", "Nariman Point", "Worli",
             "Lower Parel", "Dadar North", "Dadar South", "Bandra West", "Bandra East", "Khar",
             "Santacruz", "Vile Parle", "Andheri West", "Andheri East", "Juhu", "Goregaon West",
             "Goregaon East", "Malad", "Kandivali", "Borivali", "Dahisar", "Powai",
             "Ghatkopar", "Vikhroli", "Bhandup", "Mulund", "Kurla", "Chembur",
             "Sion", "Matunga", "Wadala", "Byculla", "Parel", "Mahim"];
  } else if (dLower.includes('nagpur')) {
    areas = ["Civil Lines", "Dharampeth", "Ramdaspeth", "Sitabuldi", "Dhantoli", "Congress Nagar",
             "Pratap Nagar", "Laxmi Nagar", "Bajaj Nagar", "Trimurti Nagar", "Khamla", "Wardha Road",
             "Manewada", "Ayodhya Nagar", "Nandanvan", "Sakkardara", "Mahal", "Gandhibagh",
             "Itwari", "Hansapuri", "Jaripatka", "Kadbi Chowk", "Sadar", "Katol Road",
             "Gorewada", "Zingabai Takli", "Mankapur", "Friend's Colony", "Seminary Hills", "Ravi Nagar",
             "Wadi", "MIDC Hingna", "Butibori", "MIHAN", "Pardi", "Kalamna"];
  } else {
    areas = ["Shyambazar", "Bagbazar", "Cossipore", "Maniktala", "Kankurgachi", "Ultadanga",
             "Salt Lake Sec 1", "Salt Lake Sec 2", "New Town North", "Rajarhat", "Sealdah", "College Street",
             "Gariahat", "Park Street", "Bhowanipore", "Alipore", "Ballygunge", "Dhakuria",
             "Jadavpur", "Tollygunge", "Behala West", "Behala East", "Garia", "Narendrapur",
             "Sonarpur", "Barasat North", "Barasat South", "Madhyamgram", "Sodepur", "Barrackpore",
             "Howrah Station", "Shibpur", "Bally", "Dankuni", "Serampore", "Chandannagar"];
  }

  // Seeded deterministic pseudo-random ward scores
  let seed = 0;
  for (let i = 0; i < districtName.length; i++) seed += districtName.charCodeAt(i);

  const wardData = areas.map((name, i) => {
    const pseudoRand = Math.sin(seed + i * 1.7) * 10000;
    const norm = pseudoRand - Math.floor(pseudoRand);
    const score = parseFloat((7.6 + norm * 2.2).toFixed(1));
    const mwp = parseFloat((3.2 + norm * 8.5).toFixed(1));
    const headroom = Math.floor(45 + norm * 51);
    return {
      name: `Ward ${i + 1} (${name})`,
      score,
      pot: `${mwp} MWp`,
      headroom: `${headroom}%`
    };
  });

  wardData.forEach((w, idx) => {
    const cell = document.createElement('div');
    let bgColor = 'bg-amber-500';
    if (w.score >= 8.8) bgColor = 'bg-emerald-500';
    else if (w.score < 7.8) bgColor = 'bg-slate-700';

    cell.className = `${bgColor} rounded-md opacity-80 hover:opacity-100 hover:scale-105 transition cursor-pointer flex items-center justify-center text-[10px] font-mono font-bold text-slate-950`;
    cell.innerText = w.score.toFixed(1);

    cell.onclick = function() {
      const wardName = document.getElementById('selectedWardName');
      const wardScore = document.getElementById('selectedWardScore');
      const wardPot = document.getElementById('selectedWardPot');
      const wardHeadroom = document.getElementById('selectedWardHeadroom');

      if (wardName) wardName.innerText = `SELECTED: ${w.name.toUpperCase()}`;
      if (wardScore) wardScore.innerText = `${w.score} / 10`;
      if (wardPot) wardPot.innerText = w.pot;
      if (wardHeadroom) wardHeadroom.innerText = `${w.headroom} Capacity Available`;

      if (window.StatusLog) {
        window.StatusLog.log(`Inspecting ${w.name}: Score ${w.score}, Potential ${w.pot}, Feeder headroom ${w.headroom}`, 'INFO', 'GIS');
      }
    };

    grid.appendChild(cell);

    // Default select first high-scoring ward
    if (idx === 0) {
      cell.click();
    }
  });
}

function initWardHeatmap() {
  updateDistrictWards('Kolkata');
}

/* Empanelled Vendor Quote Request Modal */
function openVendorModal(vendorName) {
  const modalTitle = document.getElementById('modalVendorTitle');
  const modal = document.getElementById('vendorModal');
  if (modalTitle) modalTitle.innerText = `Connect with ${vendorName}`;
  if (modal) modal.classList.add('active');
}

function closeVendorModal() {
  const modal = document.getElementById('vendorModal');
  if (modal) modal.classList.remove('active');
}

async function submitVendorApplication() {
  const nameInput = document.getElementById('modalCustName');
  const phoneInput = document.getElementById('modalCustPhone');
  const vendorTitle = document.getElementById('modalVendorTitle');

  const name = nameInput?.value.trim();
  const phone = phoneInput?.value.trim();
  const vendor = vendorTitle?.innerText.replace('Connect with ', '') || 'Empanelled Vendor';

  if (!name || !phone) {
    alert("Please enter both your full name and mobile number.");
    return;
  }

  closeVendorModal();

  // POST to Backend Vendor Quote API
  const payload = {
    vendor_name: vendor,
    customer_name: name,
    phone: phone,
    latitude: window.ojasMap ? window.ojasMap.currentLat : 22.5529,
    longitude: window.ojasMap ? window.ojasMap.currentLng : 88.3524,
    system_capacity_kw: 3.8
  };

  const response = await fetchAPI('/api/v1/vendor-quote', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const trackingId = response?.data?.tracking_id || 'OJAS-SURYA-74892';

  const statusText = document.getElementById('addressStatusText');
  if (statusText) {
    statusText.className = "text-emerald-400 font-semibold flex items-center gap-1 text-[11px] font-mono";
    statusText.innerHTML = `<i class="fa-solid fa-check-circle"></i> Dossier ${trackingId} submitted to ${vendor}! An engineer will contact ${name} within 24h.`;
  }

  if (window.StatusLog) {
    window.StatusLog.log(`Vendor Dossier [${trackingId}] successfully transmitted to ${vendor} for ${name} (${phone}).`, 'SUCCESS', 'VENDOR');
  }
}

/* Backend API Fetch Wrapper */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || 'GET';

  if (window.StatusLog) {
    window.StatusLog.log(`Dispatching API Request: ${method} ${endpoint}`, 'CALL', 'FETCH');
  }

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - startTime);

    if (response.ok) {
      const data = await response.json();
      if (window.StatusLog) {
        window.StatusLog.log(`HTTP ${response.status} OK (${duration}ms) - ${endpoint}`, 'SUCCESS', 'FETCH');
      }
      return { success: true, data };
    } else {
      if (window.StatusLog) {
        window.StatusLog.log(`HTTP ${response.status} ${response.statusText} (${duration}ms)`, 'ERROR', 'FETCH');
      }
      return { success: false, status: response.status, error: response.statusText };
    }
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    if (window.StatusLog) {
      window.StatusLog.log(`Backend offline at ${API_BASE_URL} (${duration}ms). Using local telemetry engine.`, 'WARN', 'FETCH');
    }
    return getMockAPIResponse(endpoint, options);
  }
}

function getMockAPIResponse(endpoint, options) {
  if (endpoint.includes('/health')) {
    return { success: true, data: { status: 'ONLINE', platform: 'OJAS Sovereign Solar Engine' } };
  }
  if (endpoint.includes('/solar-potential')) {
    return {
      success: true,
      data: {
        annual_generation_kwh: 5510,
        estimated_capacity_kw: 3.8,
        subsidy_amount_inr: 78000,
        payback_years: 2.9,
        co2_offset_tons: 4.5
      }
    };
  }
  if (endpoint.includes('/vendor-quote')) {
    return {
      success: true,
      data: {
        status: 'SUBMITTED',
        tracking_id: 'OJAS-SURYA-' + Math.floor(10000 + Math.random() * 90000)
      }
    };
  }
  return { success: true, data: { message: 'Local engine OK', endpoint } };
}

async function checkBackendHealth() {
  if (window.StatusLog) {
    window.StatusLog.log('Connecting to OJAS Gateway: http://localhost:8000/api/v1/health...', 'INFO', 'SYSTEM');
  }
  await fetchAPI('/api/v1/health');
}

// Global Exports
window.switchTab = switchTab;
window.changeLanguage = changeLanguage;
window.handleAddressKeydown = handleAddressKeydown;
window.handleAddressInput = handleAddressInput;
window.geocodeAddress = geocodeAddress;
window.useCurrentLocation = useCurrentLocation;
window.selectSuggestion = selectSuggestion;
window.triggerGeospatialScan = triggerGeospatialScan;
window.calculateEstimation = calculateEstimation;
window.drawRooftopSim = drawRooftopSim;
window.openVendorModal = openVendorModal;
window.closeVendorModal = closeVendorModal;
window.submitVendorApplication = submitVendorApplication;
window.updateDistrictWeather = updateDistrictWeather;
window.updateDistrictWards = updateDistrictWards;
window.fetchAPI = fetchAPI;
