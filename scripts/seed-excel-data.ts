/**
 * Seed the database with all data from doc/Réparation et entretien.xlsx
 * Run: npx tsx scripts/seed-excel-data.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/* ─── Excel dates: "4/1/26" → 2026-04-01 ─── */
function parseDate(raw: string): Date {
  const [m, d, y] = raw.split("/").map(Number);
  return new Date(2000 + y, m - 1, d);
}

/* ─── Excel data (verbatim from the file) ─── */

// REPARATIONS — 11 rows, cols: Date, N°, Nom du PDV, Canal, Propriétaire, N° TEL, Province, Commune, Colline/Quartier, N° d'identification, Avenue & N°, Type Frigo, Marque, objet de l'intervention
const repairs = [
  ["4/1/26","1","Bar Kukayaga","Bar","Niyongabo Salvator","72441920","Bujumbura Mairie","Kanyosha","Kanyosha","ID4000227765","4eme Av;num59","Fv400","Coca Cola","Remplacement de filtre,vanne,baguette et chargement de Gaz R134a"],
  ["4/1/26","2","Bar Kukayaga","Bar","Niyongabo Salvator","72441921","Bujumbura Mairie","Kanyosha","Kanyosha","ID400383795","4eme Av;num59","Fv400","Coca Cola","Remplacement de filtre,vanne,baguette et chargement de Gaz R134a"],
  ["4/1/26","3","Snack-Bar Mini Olympic","Bar","Mwami","71303934","Bujumbura Mairie","Kanyosha","Nyabugete","ID430001022203010035","Av Nyabugete","fv400","Ocean","Remplacement de filtre,vanne,baguette et chargement de Gaz R134a"],
  ["4/1/26","4","Boutique chez Yvette","KCB","Yvette","66075287","Bujumbura Mairie","Kanyosha","Kanyosha","ID400383483","Av canne à sucre,Num 10","FV400","Coca cola","Remplacement de Compresseur 275w,filtre,vanne,baguette,tube led 16w et chargement de Gaz R134a"],
  ["4/2/26","5","Bar Chez Muhutukazi","Bar","Muhutukazi","77741211","Bujumbura Mairie","Gihosha","Mutanga Nord","ID4000235820","Av Nkondo;num19","Fv400","Primus","Remplacement de filtre,vanne et chargement de Gaz R134a"],
  ["4/2/26","6","Bar la promesse","Bar","Promesse","65969055","Bujumbura Mairie","Gihosha","Mutanga Nord","ID400ILLISIBLE","Av Murembwe","Fv400","Coca cola","Remplacement d'une fiche male,relais de demarrage et condensateur 80mfa"],
  ["4/2/26","7","Bar resto DCC","Bar","Bar DCC","68324841","Bujumbura Mairie","Kinindo","Kinindo","SCCJ730001012202190033","Av du large","Ocean","Heineken","Remplacement de relais de demarrage et condensateur 80mfa"],
  ["4/3/26","8","Amaria Luxe Hotel","Hotel","Amaria Luxe","22281365","Bujumbura Mairie","Rohero","Rohero","ID400383324","Av de L'Industrie N°07","Fv400","Coca Cola","Remplacement d'un compreseur 275w, filtre,vanne et chargement de Gaz R134a"],
  ["4/3/26","9","Snack Bar Waka Waka","Bar","Raymundo","22279215","Bujumbura Mairie","Rohero","Rohero","ID4000236016","Place De L'independance","Fv400","Amstel","Remplacement d'un ventilateur 0,20A"],
  ["4/3/26","10","Apero club","Bar","Steve","79952063","Bujumbura Mairie","Rohero","Rohero","ID1100223969","Av de la France","FV1000","Amstel","Remplacement d'un ventilateur 0,20A"],
  ["4/3/26","11","Mount Zion Hotel","Hotel","Nikobiri Sion","22210007","Bujumbura Mairie","Rohero","Rohero","ID650110478","Av Mao N°04","FV650","Heineken","Remplacement de filtre,vanne et chargement de Gaz R600a"],
];

// ENTRETIENS — 101 rows, same cols minus "objet de l'intervention"
// Date is null for continuation rows (same day as last non-null date)
const maintenanceRaw: (string | null)[][] = [
  ["4/1/26","1","Favelas","Bar","Nkurunziza Patrick","79900957","Bujumbura Mairie","Rohero","Rohero","ID1100225803","Av du palmier; Num05","FV1000","Amstel"],
  [null,"2","Favelas","Bar","Nkurunziza Patrick","79900957","Bujumbura Mairie","Rohero","Rohero","ID4000227926","Av du palmier; Num05","FV400","Amstel"],
  [null,"3","Favelas","Bar","Nkurunziza Patrick","79900957","Bujumbura Mairie","Rohero","Rohero","ID1100225786","Av du palmier; Num05","FV1000","Amstel"],
  [null,"4","Favelas","Bar","Nkurunziza Patrick","79900957","Bujumbura Mairie","Rohero","Rohero","BDCJ430001022203010065","Av du palmier; Num05","Ocean","Amstel"],
  [null,"5","Favelas","Bar","Nkurunziza Patrick","79900957","Bujumbura Mairie","Rohero","Rohero","ID400383667","Av du palmier; Num05","Fv400","Coca Cola"],
  [null,"6","Favelas","Bar","Nkurunziza Patrick","79900957","Bujumbura Mairie","Rohero","Rohero","8102686866","Av du palmier; Num05","Congelateur","David Xl"],
  [null,"7","Alimentation Markita","Alimentation","Lyse Gahimbare","75827771","Bujumbura Mairie","Rohero","Rohero","ID400383496","Av Manguier","FV1000","Amstel"],
  [null,"8","Sky Blue Bar","Bar","Nsabimana Isaac","79999144","Bujumbura Mairie","Rohero","Rohero","ID4000309939","Av du palmier N°06","Fv400","Amstel"],
  [null,"9","Sky Blue Bar","Bar","Nsabimana Isaac","79999144","Bujumbura Mairie","Rohero","Rohero","ID400424914","Av du palmier N°06","Fv400","Coca Cola"],
  [null,"10","Chateau 9","Restaurant","Marie Claire Burikukiye","79934377","Bujumbura Mairie","Rohero","Rohero","ID4000319791","Av du palmier","FV100","Coca Cola"],
  [null,"11","Chateau 9","Restaurant","Marie Claire Burikukiye","79934377","Bujumbura Mairie","Rohero","Rohero","ID4000319909","Av du palmier","Fv400","Coca cola"],
  [null,"12","Bar Cathedrale","Bar","Cathedrale","79403040","Bujumbura Mairie","Rohero","Rohero","ID400383897","Blvrd Patrice Lumumba","FV1000","Amstel"],
  [null,"13","Bar Cathedrale","Bar","Cathedrale","79403040","Bujumbura Mairie","Rohero","Rohero","ID4000309535","Blvrd Patrice Lumumba","Fv400","Coca cola"],
  [null,"14","Passific hotel","Hotel","Kabanyegeye Pascasie","79954871","Bujumbura Mairie","Rohero","Rohero","ID4000227905","Av Manguier N°08","Fv100","Coca Cola"],
  [null,"15","Bar Le Petit Monocle","Bar","Cathedrale","76660718","Bujumbura Mairie","Rohero","Rohero","ID4000236084","Av Gitega;num1","FV400","Heineken"],
  [null,"16","Bar Le Petit Monocle","Bar","Cathedrale","76660718","Bujumbura Mairie","Rohero","Rohero","ID400383841","Av Gitega;num1","Fv400","Amstel"],
  [null,"17","Bar Le Petit Monocle","Bar","Cathedrale","76660718","Bujumbura Mairie","Rohero","Rohero","ID400383894","Av Gitega;num1","FV100","Coca Cola"],
  [null,"18","Bar Le Petit Monocle","Bar","Cathedrale","76660718","Bujumbura Mairie","Rohero","Rohero","ID400424888","Av Gitega;num1","FV400","Heineken"],
  [null,"19","Bar Le Petit Monocle","Bar","Cathedrale","76660718","Bujumbura Mairie","Rohero","Rohero","ID650110487","Av Gitega;num1","Fv400","Amstel"],
  [null,"20","Bar Le Petit Monocle","Bar","Cathedrale","76660718","Bujumbura Mairie","Rohero","Rohero","ID4000227529","Av Gitega;num1","Fv400","Amstel"],
  [null,"21","Bar Le Petit Monocle","Bar","Cathedrale","76660718","Bujumbura Mairie","Rohero","Rohero","ID650110483","Av Gitega;num1","FV100","Coca Cola"],
  [null,"22","Resto Bar Mutsinda","Bar","Sakubu","79992185","Bujumbura Mairie","Rohero","Rohero","ID4000235939","Av Mimosa N°15","Fv400","Coca Cola"],
  [null,"23","Al.Chaline shop","Alimentation","Aline","79794668","Bujumbura Mairie","Rohero","Rohero","ID2800329711","Av JRR N°10","FV280","Coca Cola"],
  [null,"24","Bar le Flamboyant","Bar","Flamboyant","22224220","Bujumbura Mairie","Rohero","Rohero","ID4000236116","Av Ngozi/pas de numero","FV400","Coca Cola"],
  [null,"25","Bar le Flamboyant","Bar","Flamboyant","22224220","Bujumbura Mairie","Rohero","Rohero","ID4000236095","Av Ngozi/pas de numero","FV400","Amstel"],
  [null,"26","Bar le Flamboyant","Bar","Flamboyant","22224220","Bujumbura Mairie","Rohero","Rohero","ID4000309782","Av Ngozi/pas de numero","FV400","Amstel"],
  [null,"27","Bar le Flamboyant","Bar","Flamboyant","22224220","Bujumbura Mairie","Rohero","Rohero","BDCJ600001022303240210","Av Ngozi/pas de numero","Ocean","Amstel"],
  [null,"28","Resto bar Inyambo","Bar","Inyambo","65883817","Bujumbura Mairie","Rohero","Rohero","BDCJ430001022203010008","AV","Ocean","Amstel"],
  [null,"29","Bar New Sauna Massage","Bar","Kamariza Claudia","75904835","Bujumbura Mairie","Rohero","Rohero","ID4000319951","Av Ngozi/pas de numero","FV400","Coca Cola"],
  [null,"30","Bar New Sauna Massage","Bar","Kamariza Claudia","75904835","Bujumbura Mairie","Rohero","Rohero","BDCJ430001022203010053","Av Ngozi/pas de numero","Congelateur","Ocean"],
  [null,"31","Bar new force sauna massage","Bar","Kamariza Claudia","75904835","Bujumbura Mairie","Rohero","Rohero","ID4000309570","Av Ngozi;Num21","Fv400","Coca Cola"],
  [null,"32","Bar new force sauna massage","Bar","Kamariza Claudia","75904835","Bujumbura Mairie","Rohero","Rohero","ID4000310113","Av Ngozi;Num21","Fv400","Coca cola"],
  [null,"33","Bar new force sauna massage","Bar","Kamariza Claudia","75904835","Bujumbura Mairie","Rohero","Rohero","ID4000310263","Av Ngozi;Num21","Fv400","Amstel"],
  [null,"34","Bar new force sauna massage","Bar","Kamariza Claudia","75904835","Bujumbura Mairie","Rohero","Rohero","ID4000310332","Av Ngozi;Num21","Fv400","Amstel"],
  [null,"35","Allim Chez Wege","Bar","Wege","22226209","Bujumbura Mairie","Rohero","Rohero","ID20034304353","Av Mwezi Gisabo","FV400","Coca Cola"],
  [null,"36","Hotel le chandelier","Hotel","Le chandelier","22276803","Bujumbura Mairie","Rohero","Rohero","ID4000236198","Av de la JRR","FV100","Coca Cola"],
  [null,"37","Hotel le chandelier","Hotel","Le chandelier","22276803","Bujumbura Mairie","Rohero","Rohero","ID4000236209","Av de la JRR","FV280","Coca Cola"],
  ["4/2/26","38","Kiosque Plaza","Kcb","Marie Beatrice","75960011","Bujumbura Mairie","Rohero","Rohero","ID400144155","Av du marche/pas de numero","FV400","coca cola"],
  [null,"39","Kiosque Plaza","Kcb","Marie Beatrice","75960011","Bujumbura Mairie","Rohero","Rohero","ID400424797","Av du marche/pas de numero","FV400","coca cola"],
  [null,"40","Mess Des Officiers","Bar","Col Niyonkuru","22224040","Bujumbura Mairie","Rohero","Rohero","ID4000309563","Blvrd du 28 Nov/pas numero","Fv1000","Amstel"],
  [null,"41","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","ID1100225841","Blvrd Du 28 Novembre","Fv400","Heineken"],
  [null,"42","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","SCCJ43000102220105280027","Blvrd Du 28 Novembre","Ocean","Amstel"],
  [null,"43","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","SCCJ430001022203010037","Blvrd Du 28 Novembre","Ocean","Amstel"],
  [null,"44","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","823893513","Blvrd Du 28 Novembre","Congelateur","Liebherr"],
  [null,"45","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","788184114","Blvrd Du 28 Novembre","Congelateur","Liebherr"],
  [null,"46","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","SCCJ730001012303250049","Blvrd Du 28 Novembre","Ocean","Amstel"],
  [null,"47","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","BDCJ600001022303240163","Blvrd Du 28 Novembre","Ocean","Amstel"],
  [null,"48","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","8102686861","Blvrd Du 28 Novembre","Congelateur","Liebherr"],
  [null,"49","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","ID400384204","Blvrd Du 28 Novembre","Fv400","Coca cola"],
  [null,"50","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","ID1100225801","Blvrd Du 28 Novembre","FV1000","Amstel"],
  [null,"51","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","ID4000227897","Blvrd Du 28 Novembre","Fv400","Amstel"],
  [null,"52","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","602672","Blvrd Du 28 Novembre","Pression","David XL"],
  [null,"53","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","623893162","Blvrd Du 28 Novembre","Pression","David XL"],
  [null,"54","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","SCCJ350BX00101210520036","Blvrd Du 28 Novembre","Fv400","Amstel"],
  [null,"55","Bar Mess Des Officiers","Bar","Mess Des Officiers","22214040","Bujumbura Mairie","Rohero","Rohero","ID4000309548","Blvrd Du 28 Novembre","Fv400","Amstel"],
  [null,"56","Boutique 257 chez Andy","Kcb","Andy","68674185","Bujumbura Mairie","Rohero","Rohero","SCCJ35000101210520025","Av Ngendandumwe","Ocean","Amstel"],
  [null,"57","Evryday shop","Alimentation","Nahayo Mamer","79992965","Bujumbura Mairie","Rohero","Rohero","ID400383838","Av Ngendandumwe","Fv400","Amstel"],
  [null,"58","Snack Bar Chez Gerard","Bar","Gerard","77733157","Bujumbura Mairie","Rohero","Rohero","ID1100223957","Av Ngendandumwe;num40","Fv400","Coca Cola"],
  [null,"59","Snack Bar Chez Gerard","Bar","Gerard","77733157","Bujumbura Mairie","Rohero","Rohero","ID4000235946","Av Ngendandumwe;num40","Fv1000","Amstel"],
  [null,"60","Snack Bar Chez Gerard","Bar","Gerard","77733157","Bujumbura Mairie","Rohero","Rohero","BDCJ430001022105280034","Av Ngendandumwe;num40","Ocean","Amstel"],
  [null,"61","Kiosque Jardin public","Kcb","Jardin public","76380261","Bujumbura Mairie","Rohero","Rohero","ID400384230","Av Ngendandumwe","FV100","Coca Cola"],
  [null,"62","Harry's Grill House","Bar","Harry","75586677","Bujumbura Mairie","Rohero","Rohero","ID4000310253","Av des travailleurs;Num17","Fv1000","Primus"],
  [null,"63","Harry's Grill House","Bar","Harry","75586678","Bujumbura Mairie","Rohero","Rohero","ID4000309814","Av des travailleurs;Num17","Fv400","Coca Cola"],
  [null,"64","Pick up bar","Bar","Pick up","71384617","Bujumbura Mairie","Rohero","Rohero","8102682001","Av P.L.Rwagasore","Pression","David XL"],
  [null,"65","Pick up bar","Bar","Pick up","71384617","Bujumbura Mairie","Rohero","Rohero","SCCJ730001012303250033","Av P.L.Rwagasore","Ocean","Amstel"],
  [null,"66","Pick up bar","Bar","Pick up","71384617","Bujumbura Mairie","Rohero","Rohero","SCCJ60001022303240155","Av P.L.Rwagasore","Ocean","Amstel"],
  [null,"67","Pick up bar","Bar","Pick up","71384617","Bujumbura Mairie","Rohero","Rohero","BDCJ600001022303240212","Av P.L.Rwagasore","Ocean","Amstel"],
  [null,"68","Conteneur chez Candide","KCB","Candide","76265000","Bujumbura Mairie","Rohero","Rohero","ID400157595","Av de la JRR","Fv400","Coca Cola"],
  [null,"69","Twesta bar","Bar","Beatrice","68876991","Bujumbura Mairie","Rohero","Rohero","ID1100225851","Av Ngendandumwe","FV1000","Amstel"],
  ["4/3/26","70","Kiosque Coca Cola Corner","Kcb","Rumbeti","79922094","Bujumbura Mairie","Rohero","Rohero","ID400383565","Av P.L.Rwagasore/pas de numero","Fv400","Coca Cola"],
  [null,"71","Kiosque Coca Cola Corner","Kcb","Rumbeti","79922094","Bujumbura Mairie","Rohero","Rohero","ID400097266","Av P.L.Rwagasore/pas de numero","Fv400","Coca Cola"],
  [null,"72","Kiosque Coca Cola Corner","Kcb","Rumbeti","79922094","Bujumbura Mairie","Rohero","Rohero","ID400097291","Av P.L.Rwagasore/pas de numero","Fv400","Coca Cola"],
  [null,"73","Kiosque Coca Cola Corner","Kcb","Rumbeti","79922095","Bujumbura Mairie","Rohero","Rohero","ID400ILLISIBLE4949","Av P.L.Rwagasore/pas de numero","Fv401","Coca Cola"],
  [null,"74","Best Mirton Hotel","Bar","Mirton Bar","22281528","Bujumbura Mairie","Rohero","Rohero","ID4000236215","Av de la Revolution,Num 14","Fv400","Royal"],
  [null,"75","Best Mirton Hotel","Bar","Mirton Bar","22281528","Bujumbura Mairie","Rohero","Rohero","ID4000310103","Av de la Revolution,Num 14","Fv400","Coca Cola"],
  [null,"76","BTC umuco","Alimentation","Annicet Ndagijimana","79316303","Bujumbura Mairie","Rohero","Rohero","ID400383782","Av de la liberté","Fv400","Coca Cola"],
  [null,"77","BTC umuco","Alimentation","Annicet Ndagijimana","79316303","Bujumbura Mairie","Rohero","Rohero","SCCJ730001012302190025","Av de la liberté","Ocean","Amstel"],
  [null,"78","La confiance","Alimentation","Adèle Ndayizeye","71338468","Bujumbura Mairie","Rohero","Rohero","ID4000310421","Av De l'industrie","FV400","Coca Cola"],
  [null,"79","Kiosque la confidence","Kcb","Fidelité Nimenya","79608240","Bujumbura Mairie","Rohero","Rohero","ID100386342","Av De l'industrie","FV100","Coca cola"],
  [null,"80","Hotel Lekker ex:Dorado Hotel","Hotel","Dieudonné","61930430","Bujumbura Mairie","Rohero","Rohero","ID400383414","Av De L'industrie N°31","Fv400","Coca Cola"],
  [null,"81","Hotel Lekker ex:Dorado Hotel","Hotel","Dieudonné","61930430","Bujumbura Mairie","Rohero","Rohero","ID4000227528","Av De L'industrie N°31","Fv400","Heineken"],
  [null,"82","Amaria Luxe Hotel","Hotel","Amaria Luxe","22281365","Bujumbura Mairie","Rohero","Rohero","ID400383324B","Av de L'Industrie N°07","Fv400","Coca Cola"],
  [null,"83","Amaria Luxe Hotel","Hotel","Amaria Luxe","22281365","Bujumbura Mairie","Rohero","Rohero","ID4000236222","Av de L'Industrie N°07","Fv400","Royale"],
  [null,"84","Resto bar Desperados","Bar","Ngomirakiza Robert","76120440","Bujumbura Mairie","Rohero","Rohero","ID4000236170","AV D'aout/pas de numero","Fv400","Amstel"],
  [null,"85","Resto bar Desperados","Bar","Ngomirakiza Robert","76120440","Bujumbura Mairie","Rohero","Rohero","ID4000227523","AV D'aout/pas de numero","Fv400","Amstel"],
  [null,"86","Resto bar Desperados","Bar","Ngomirakiza Robert","76120440","Bujumbura Mairie","Rohero","Rohero","ID4000309546","AV D'aout/pas de numero","Fv400","Coca Cola"],
  [null,"87","Resto bar Desperados","Bar","Ngomirakiza Robert","76120440","Bujumbura Mairie","Rohero","Rohero","BDCJ600001022303240211","AV D'aout/pas de numero","Congelateur","Ocean"],
  [null,"88","Resto bar Desperados","Bar","Ngomirakiza Robert","76120440","Bujumbura Mairie","Rohero","Rohero","SCCJ730001022303250016","AV D'aout/pas de numero","Congelateur","Ocean"],
  [null,"89","Resto bar Desperados","Bar","Ngomirakiza Robert","76120440","Bujumbura Mairie","Rohero","Rohero","8102682030","AV D'aout/pas de numero","Pression","David Xl"],
  [null,"90","Alimentation Au Petit Schengen","Alimentation","Muzaneza Beatrice","75980225","Bujumbura Mairie","Rohero","Rohero","ID400383526","Av Muyinga","FV1000","Amstel"],
  [null,"91","Alimentation Au Petit Schengen","Alimentation","Muzaneza Beatrice","75980225","Bujumbura Mairie","Rohero","Rohero","ID4000236226","Av Muyinga","FV100","Coca Cola"],
  [null,"92","Salon de coiffure chez Jeane","Kcb","Jeanne","79931959","Bujumbura Mairie","Rohero","Rohero","ID100414845","Blvrd P.L. Rwagasore","FV400","Coca Cola"],
  [null,"93","Shanning salon","salon","Claude","79928992","Bujumbura Mairie","Rohero","Rohero","ID100386373","PL Rwagasore","FV100","Coca Cola"],
  [null,"94","Café Au Petit Plateaux","Cafetariat","Louise","71169601","Bujumbura Mairie","Rohero","Rohero","ID400383887","Blvrd P.L. Rwagasore","Fv400","Coca Cola"],
  [null,"95","Station Butanyerera","Station","Nizigiyimana Lacatus","79945813","Bujumbura Mairie","Rohero","Rohero","ID100414841","RN7 N°16","Fv100","Coca Cola"],
  [null,"96","Fast take away food","Fast Food","Chantal","79511885","Bujumbura Mairie","Rohero","Rohero","ID2800329812","blvrd de l'UPRONA","FV280","Coca Cola"],
  [null,"97","Cyber Multi Service","Cyber","Nyagashahu Cecile","71846704","Bujumbura Mairie","Rohero","Rohero","ID400383480","Av De La Revolution","Fv400","Coca Cola"],
  [null,"98","Kiosque chez Ndizeye Louis","Kcb","Ndizeye","62474217","Bujumbura Mairie","Rohero","Rohero","ID400ILLISIBLE2","Blvrd P.L. Rwagasore","FV400","Coca Cola"],
  [null,"99","Boutique chez Aline","Kcb","Aline","79944664","Bujumbura Mairie","Rohero","Rohero","ID100386406","Blvrd P.L. Rwagasore","FV100","Coca Cola"],
  [null,"100","Boutique chez Claude","Kcb","Claude","79482419","Bujumbura Mairie","Rohero","Rohero","ID100ILLISIBLE","Blvrd P.L. Rwagasore","FV100","Coca Cola"],
  [null,"101","Bar kumbaragasa","Bar","Odette","61112638","Bujumbura Mairie","Rohero","Rohero","ID400ILLISIBLE3","Av de l'industrie","FV400","Coca Cola"],
];

/* Fill forward the date column */
function fillDates(rows: (string | null)[][]): string[][] {
  let lastDate = "";
  return rows.map((row) => {
    if (row[0]) lastDate = row[0];
    return [lastDate, ...row.slice(1)] as string[];
  });
}

async function main() {
  console.log("🔧 Seeding Excel data into database...\n");

  // Get a technician to assign interventions to
  const tech = await prisma.user.findFirst({ where: { role: "TECHNICIAN" } });
  if (!tech) {
    console.error("No technician user found. Run the main seed (npx prisma db seed) first.");
    process.exit(1);
  }
  console.log(`Using technician: ${tech.fullName}`);

  // Upsert cities
  const cityCache: Record<string, string> = {};
  async function getOrCreateCity(name: string): Promise<string> {
    const key = name.trim();
    if (cityCache[key]) return cityCache[key];
    const city = await prisma.city.upsert({
      where: { name: key },
      update: {},
      create: { name: key },
    });
    cityCache[key] = city.id;
    return city.id;
  }

  // Track POS + refrigerators by serial (idNumber)
  const serialCache: Record<string, string> = {}; // serialNumber → refrigeratorId

  async function ensureFridge(row: string[], commune: string): Promise<string> {
    const [, , posName, channel, owner, phone, , , neighbourhood, idNumber, streetNo, fridgeType, brand] = row;
    const serial = (idNumber || "").trim().replace(/\s+/g, "");

    if (serialCache[serial]) return serialCache[serial];

    // Check if fridge exists in DB
    const existing = await prisma.refrigerator.findUnique({ where: { serialNumber: serial } });
    if (existing) {
      serialCache[serial] = existing.id;
      return existing.id;
    }

    // Create POS + fridge
    const cityId = await getOrCreateCity(commune);
    const pos = await prisma.pos.create({
      data: {
        cityId,
        posName: posName?.trim() || "Unknown",
        channel: channel?.trim() || null,
        owner: owner?.trim() || null,
        phoneNumber: phone?.trim() || null,
        state: "Bujumbura Mairie",
        neighbourhood: neighbourhood?.trim() || null,
        idNumber: serial || null,
        streetNo: streetNo?.trim() || null,
      },
    });

    const fridge = await prisma.refrigerator.create({
      data: {
        posId: pos.id,
        refrigeratorType: fridgeType?.trim() || null,
        brand: brand?.trim() || null,
        serialNumber: serial,
        status: "ACTIVE",
      },
    });

    serialCache[serial] = fridge.id;
    return fridge.id;
  }

  // ── Seed REPARATIONS ──
  console.log("\n📋 Seeding REPARATIONS...");
  let repairCount = 0;
  for (const row of repairs) {
    const commune = (row[7] as string).trim();
    const fridgeId = await ensureFridge(row as string[], commune);
    const date = parseDate(row[0] as string);
    const description = row[13] as string;

    await prisma.intervention.create({
      data: {
        refrigeratorId: fridgeId,
        technicianId: tech.id,
        type: "REPAIR",
        interventionDate: date,
        issueDescription: description,
        workDone: description,
        status: "COMPLETED",
      },
    });
    repairCount++;
    process.stdout.write(`\r  Created ${repairCount}/11 repairs`);
  }
  console.log();

  // ── Seed ENTRETIENS ──
  console.log("\n📋 Seeding ENTRETIENS...");
  const maintenance = fillDates(maintenanceRaw);
  let maintCount = 0;
  for (const row of maintenance) {
    const commune = (row[7] as string).trim();
    const fridgeId = await ensureFridge(row as string[], commune);
    const date = parseDate(row[0] as string);

    await prisma.intervention.create({
      data: {
        refrigeratorId: fridgeId,
        technicianId: tech.id,
        type: "MAINTENANCE",
        interventionDate: date,
        issueDescription: "Entretien préventif",
        workDone: "Entretien et vérification complète",
        status: "COMPLETED",
      },
    });
    maintCount++;
    process.stdout.write(`\r  Created ${maintCount}/101 maintenance entries`);
  }
  console.log();

  console.log(`\n✅ Done! Seeded ${repairCount} repairs + ${maintCount} maintenance entries (${repairCount + maintCount} total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
