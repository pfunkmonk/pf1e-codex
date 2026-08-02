/* NameForge v1.0.0 — single-file bundle (data + engine inlined).
   Drop this one file in and call NameForge.generate({race:"elf",count:5}).
   100% original/procedural output, filtered against a trademark/PI blocklist. */
;(function(){"use strict";var __DATA__={"races":{"human":{"label":"Human","kind":"core","cultures":{"generic":{"label":"Generic / Mixed","pre":["Al","Bran","Cor","Dar","El","Gar","Hal","Jor","Kel","Mar","Ned","Ol","Ren","Sel","Tom","Wil","Ada","Bri","Cae","Mira","Sera"],"mid":["a","e","i","an","en","or","el","ia"],"suf":["","n","ric","don","wen","ra","as","ie","eth","and"],"maxMid":1,"seed":{"m":["Alden","Corvin","Garret","Roderic","Tomas","Bram","Halden","Nedwyn"],"f":["Mira","Serana","Elise","Brenna","Wynne","Corra","Adela","Isaure"],"n":["Ash","Wren","Rowan","Merritt","San","Bly"]},"surname":{"mode":"compound","a":["Black","White","Green","Hart","Mill","Stone","High","Ash","Fair","Marsh"],"b":["wood","water","field","stone","ward","brook","hill","ford","gate","more"]}},"nordic":{"label":"Nordic","pre":["Bj","Sig","Hal","Thor","Gun","Ei","Ulf","Ing","Ragn","Sten","Ast","Yr","Sol","Brann","Ver"],"mid":["var","rik","ун","gr","und","or","hild","dis","run","vald"],"suf":["ar","ulf","valdr","stein","grim","a","run","dis","hild","borg"],"maxMid":1,"seed":{"m":["Halvard","Bjorn","Sten","Ragnvald","Ulfar","Torgrim","Eirik","Gunnar"],"f":["Sigrun","Astrid","Yrsa","Solveig","Ingrid","Brynja","Haldis","Rúna"],"n":["Sten","Ver","Eir","Nal"]},"surname":{"mode":"patronymic","suffixM":"sson","suffixF":"sdottir","bases":["Hal","Thor","Sten","Eirik","Gunnar","Bjorn","Ulf","Ragnar"]}},"desert":{"label":"Desert (Arabic-flavored)","pre":["Na","Za","Fa","Ra","Kha","Sa","Ha","Ja","Ta","Ya","Nu","Mi","Da"],"mid":["si","ra","li","ha","ma","di","ru","ka","na","zi"],"suf":["r","m","d","n","f","q","la","ya","im","un"],"maxMid":2,"seed":{"m":["Nasir","Farouk","Rashid","Tariq","Hakim","Jamal","Zafir","Karim"],"f":["Zahra","Layla","Samira","Nadia","Rania","Yasmin","Farah","Dalia"],"n":["Nur","Saba","Jad","Rim"]},"surname":{"mode":"nisba","prefix":"al-","bases":["Karim","Rashid","Farouk","Nasir","Zafir","Amin","Haddad","Najjar"]}},"east":{"label":"East-Asian-flavored","pre":["Rin","Wen","Kai","Mei","Sho","Jin","Hua","Ren","Yuki","Aka","Hoshi","Tao","Lin"],"mid":["ka","shi","na","to","ling","hua","ko","ru"],"suf":["","o","a","n","ko","to"," shu","ren","mei"],"maxMid":1,"seed":{"m":["Kaido","Wen Shu","Ren","Jin","Tao","Sho"],"f":["Meilin","Yuki","Akane","Hoshiko","Rin","Lian"],"n":["Kai","Wen","Rin","Shin"]},"surname":{"mode":"pool","pool":["Takao","Wen","Shu","Lin","Kaido","Mori","Sato","Hoshi","Tsang","Ito"]}},"slavic":{"label":"Slavic-flavored","pre":["Drag","Vas","Yel","Mir","Bog","Rad","Zor","Stan","Lud","Ves","Kaz","Nad"],"mid":["o","a","i","om","en","imir","oslav","ka","sha"],"suf":["mir","slav","ka","ek","ov","na","ana","yn","och"],"maxMid":1,"seed":{"m":["Dragomir","Miroslav","Bogdan","Radek","Stanek","Vasska","Ludmil"],"f":["Yelena","Nadia","Milena","Vesna","Zora","Katya","Ludmila"],"n":["Mir","Rad","Ves"]},"surname":{"mode":"suffix","suffixM":"ov","suffixF":"ova","bases":["Voran","Dragan","Milen","Radek","Zorka","Bogdan"]}},"latin":{"label":"Latin / Mediterranean","pre":["Cae","Val","Mar","Luc","Aur","Ces","Tib","Dom","Sil","Ott","Ren","Bel"],"mid":["li","er","an","in","es","ar","el","io"],"suf":["us","a","o","ius","ia","ino","ella","enzo","etta"],"maxMid":1,"seed":{"m":["Caelius","Marco","Lucio","Aurelio","Tessaro","Silvio","Renzo"],"f":["Valeria","Lucia","Bella","Ottavia","Silvana","Renata","Carina"],"n":["Sole","Vale","Rio"]},"surname":{"mode":"pool","pool":["Tessaro","Valenti","Marchetti","Aurelli","Silvano","Bellini","Renzi","Cortese"]}}},"epithet":{"generic":true}},"elf":{"label":"Elf","kind":"core","pre":["Ae","Cal","El","Fae","Il","La","Lo","My","Ny","Ri","Se","Sy","Tha","Thi","Va","Ve","Wy","Aer","Lith"],"mid":["la","ri","na","the","li","va","re","lo","si","el","wy","ia"],"suf":["riel","wyn","del","las","thil","var","nor","mira","ael","wen","lith","aine"],"sufF":["riel","wen","thil","aine","mira","lyra","wyn"],"sufM":["dor","las","thas","nor","var","dan","reth"],"seed":{"m":["Aelrindel","Caelthas","Faelar","Sylavar","Ithronel","Laereth","Variel"],"f":["Aelinor","Sylivenne","Faunra","Merisel","Thaliel","Lyriaine","Morwyn"],"n":["Ael","Sylin","Faer","Thal"]},"surname":{"mode":"compound","a":["Moon","Star","Silver","Dawn","Leaf","Willow","Ever","Twilight","Green","Amber"],"b":["whisper","song","shadow","brook","glade","weaver","wind","blossom","vale","thorn"]},"epithet":{"pool":["the Farwalker","the Moonlit","the Silent Bow","Evensong","the Gladekeeper"],"generic":true},"maxMid":1},"halfelf":{"label":"Half-Elf","kind":"core","hybridOf":["human","elf"],"pre":["De","Sa","Mir","Ky","Nar","Quin","Ari","Sel","Cal","Ren","Ela"],"mid":["ri","la","en","an","el","ia","re"],"suf":["en","iel","el","as","wyn","a","eth","ar","is"],"seed":{"m":["Deren","Kyras","Narciso","Quinray","Selael","Ariman","Caldis"],"f":["Sariel","Miriam","Elsae","Iandi","Cathwyn","Renela","Adliss"],"n":["Wren","Ash","Sael","Miri"]},"surname":{"mode":"pick2","from":["elf","human"]},"epithet":{"generic":true},"maxMid":1},"dwarf":{"label":"Dwarf","kind":"core","pre":["Thor","Bal","Dur","Gru","Bro","Kaz","Vun","Mor","Thra","Dol","Grim","Hjal","Bram"],"mid":["din","gar","mun","dek","ki","na","grum","bur","dra"],"suf":["din","grim","dek","mund","in","ar","ok","grum","a","rid","na"],"sufF":["a","ra","rid","na","gra","hild","dra"],"sufM":["din","grim","dek","mund","ar","ok","grum"],"seed":{"m":["Thordin","Durgan","Balgrim","Kazmun","Vundrek","Bromki","Grimbur"],"f":["Balgra","Vundra","Thrahild","Dagna","Morrid","Helka","Brunna"],"n":["Dur","Kaz","Brom","Thra"]},"surname":{"mode":"compound","a":["Iron","Stone","Gold","Deep","Steel","Coal","Granite","Copper","Battle","Grim"],"b":["fist","beard","forge","hammer","anvil","born","delver","brow","shield","maw"]},"epithet":{"pool":["the Unbroken","Ale-Cask","the Deep-Delver","Stoutarm","the Oathkeeper"],"generic":true},"maxMid":1},"gnome":{"label":"Gnome","kind":"core","maxMid":1,"pre":["Fib","Wren","Zook","Bim","Nim","Fizz","Dab","Pip","Wick","Cog","Bick","Tink","Quill"],"mid":["ble","er","le","a","it","un","bick","dab","o"],"suf":["le","bit","cog","undle","er","o","a","well","wick","it"],"seed":{"m":["Fibble","Zook","Bimwick","Dabner","Pip","Cogburn","Wicket"],"f":["Wren","Nimla","Fizzle","Bricka","Quilla","Tinket","Dabra"],"n":["Pip","Zook","Nim","Wick","Fizz"]},"surname":{"mode":"compound","a":["Nimble","Tinker","Spark","Cog","Fizzle","Whistle","Gear","Copper","Bumble","Widget"],"b":["cog","bottom","whistle","spanner","spark","button","gadget","wire","bobbin","fuse"]},"epithet":{"pool":["Two-Boots","the Curious","Thrice-Singed","the Tinkerer","Bright-Eyes"],"generic":true}},"halfling":{"label":"Halfling","kind":"core","pre":["Per","Ros","Mil","Bil","Mer","Tam","Dob","Nel","Wil","Poppy","Fen","Lark"],"mid":["a","o","in","er","am","und","el"],"suf":["rin","o","a","und","wise","in","by","mund","ie","let"],"seed":{"m":["Perrin","Milo","Dobby","Tamwin","Fendel","Wilby","Bram"],"f":["Rosamund","Poppy","Nella","Marigold","Bree","Lark","Tansy"],"n":["Fen","Bree","Lark","Tam"]},"surname":{"mode":"compound","a":["Good","Tea","Under","Green","Butter","Apple","Honey","Thistle","Barley","Well"],"b":["barrel","leaf","bough","meadow","kettle","field","crumb","brook","toes","hollow"]},"epithet":{"pool":["the Well-Fed","Quickfingers","the Homebound","of the Warren","Sweet-Tooth"],"generic":true},"maxMid":1},"halforc":{"label":"Half-Orc","kind":"core","hybridOf":["orc","human"],"pre":["Karn","Maz","Gor","Thok","Dar","Ren","Bru","Zal","Hark","Mora","Ash"],"mid":["a","u","ok","ar","og","na","esh"],"suf":["n","g","ug","ash","ar","a","esh","na","rok"],"seed":{"m":["Karn","Mazug","Gorak","Thokar","Brundo","Harkan","Zaldar"],"f":["Morag","Ashna","Brugna","Karesh","Thura","Zelka","Ondra"],"n":["Karn","Ash","Gor","Thok"]},"surname":{"mode":"compound","a":["Ash","Iron","Blood","Skull","War","Bone","Grim","Black","Rust","Gore"],"b":["fist","maw","splitter","tusk","born","render","brand","hide","jaw","breaker"]},"epithet":{"pool":["Ironmaw","the Unbowed","Skullsplit","the Half-Blood","Warborn"],"generic":true},"maxMid":1},"orc":{"label":"Orc","kind":"common","pre":["Gru","Mog","Thok","Zag","Ghar","Ur","Bru","Nok","Grish","Mork","Dar","Ug"],"mid":["a","u","og","ash","nak","uk","gor","muk"],"suf":["k","g","ash","uk","nak","zug","gor","muk","rok","mog"],"seed":{"m":["Grokk","Mazug","Thokrag","Zagnak","Gharuk","Morzug","Brundak"],"f":["Thara","Grisha","Urka","Nokma","Mogra","Zelka","Ghadra"],"n":["Grok","Zag","Mog","Ur"]},"surname":{"mode":"compound","a":["Skull","Blood","Iron","Bone","Gore","War","Black","Red","Grim","Fang"],"b":["split","maw","crusher","render","breaker","tusk","fist","biter","reaver","gut"]},"epithet":{"pool":["Skullsplit","the Ravager","Gutripper","the Warlord","Bonebreaker"]},"maxMid":1},"goblin":{"label":"Goblin","kind":"common","pre":["Snix","Grib","Zub","Nok","Sniv","Gik","Riz","Yip","Kreg","Mub","Taz","Wug"],"mid":["it","ub","ik","na","gub","zle","ix"],"suf":["nok","it","ub","ix","gub","z","na","gle","ki","rot"],"seed":{"m":["Snix","Gribnok","Zub","Yipgik","Kregzle","Mubrot","Tazwug"],"f":["Rizna","Snivka","Yubgle","Nokki","Grizna","Wugna","Tazix"],"n":["Snix","Zub","Gik","Yip","Wug"]},"surname":{"mode":"none"},"epithet":{"pool":["the Biter","Sharp-Tooth","Nose-Picker","the Squealer","Rat-Catcher","Two-Toes","the Sneak"],"generic":false},"maxMid":1},"hobgoblin":{"label":"Hobgoblin","kind":"common","pre":["Vor","Dreg","Kor","Har","Zol","Mag","Grath","Ber","Nul","Tark","Vex"],"mid":["kh","os","ar","um"," og","esh"],"suf":["khan","mar","os","ak","un","oth","gar","esh","dun"],"seed":{"m":["Vorkhan","Dregmar","Koros","Harak","Zolun","Grathoth","Tarkun"],"f":["Vexra","Zolna","Magesh","Berka","Nulra","Korza","Dregna"],"n":["Vor","Kor","Zol","Tark"]},"surname":{"mode":"compound","a":["Iron","Blood","Steel","Red","Black","War","Grim","Bronze"],"b":["Company","Legion","Banner","Blade","Shield","March","Standard","Cohort"],"join":"of the "},"epithet":{"pool":["of the Iron Company","the Disciplined","War-Marshal","the Unyielding"],"generic":true},"maxMid":1},"kobold":{"label":"Kobold","kind":"common","pre":["Skri","Vex","Radd","Kip","Nib","Zik","Sput","Grix","Tik","Meep","Sar","Rix"],"mid":["it","ki","sk","na","ex","ip"],"suf":["tch","ki","x","it","ka","sk","ip","na","xen"],"seed":{"m":["Skritch","Vexki","Radd","Kip","Ziksk","Grixit","Tikxen"],"f":["Nibka","Sputna","Rixit","Meepki","Sarna","Zikka","Tikna"],"n":["Kip","Nib","Zik","Rix","Meep"]},"surname":{"mode":"none"},"epithet":{"pool":["Trap-Setter","the Yipping","Gold-Sniffer","Scale-Runt","the Tunneler","Sharp-Claw"]},"maxMid":1},"lizardfolk":{"label":"Lizardfolk","kind":"common","maxMid":1,"pre":["Sess","Hess","Ssy","Xar","Vesh","Thass","Ssur","Vass","Sith","Zar","Sesh"],"mid":["ka","tha","ra","esh","si","za"],"suf":["ka","tha","ra","esh","ix","ssa","urr","akt"],"seed":{"m":["Sesskt","Hesskra","Xarssk","Vesharu","Thasskt","Ssurix"],"f":["Ssythra","Hessa","Vasskt","Zssira","Ssurra","Xaressa"],"n":["Sesk","Hess","Xar","Vesh","Zss"]},"surname":{"mode":"descriptive"},"epithet":{"pool":["Watches-the-Reeds","Still-Water","Breaks-the-Bone","Swims-at-Dusk","Counts-the-Dead","Tail-of-Iron"],"descriptive":true}},"tiefling":{"label":"Tiefling","kind":"common","pre":["Mal","Zar","Akm","Nyx","Vex","Kaine","Sar","Mor","Bel","Ther","Az"],"mid":["a","e","ak","el","or","ra","ith"],"suf":["ar","ael","eth","oth","ax","is","ra","ion","us"],"seed":{"m":["Malakar","Zarael","Akmeth","Vexor","Kaineth","Morrus","Belion"],"f":["Zaraeth","Malra","Nyxis","Sarael","Therra","Azael","Velith"],"n":["Nyx","Vex","Sar","Zar"]},"virtues":["Solace","Ruin","Hope","Sorrow","Temperance","Reverence","Dread","Mercy","Vengeance","Fortune","Silence","Ardor"],"surname":{"mode":"none"},"epithet":{"pool":["the Marked","Ashborn","the Fallen-Blooded","Hell-Touched","the Unrepentant"],"generic":true},"maxMid":1},"aasimar":{"label":"Aasimar","kind":"common","pre":["Aur","Cael","Seraph","Cas","Lum","Ver","Zar","El","Ori","Val","Ther"],"mid":["a","e","i","el","ia","or","an"],"suf":["iel","on","a","ius","ine","ael","ora","ith","el"],"seed":{"m":["Aurelian","Cassiel","Lumon","Verion","Orith","Zarael","Theron"],"f":["Seraphine","Aurelia","Caeliel","Verity","Lumine","Orina","Elora"],"n":["Cael","Aur","Lum","Ori"]},"virtues":["Verity","Grace","Valor","Mercy","Hope","Faith","Dawn","Radiance","Justice"],"surname":{"mode":"compound","a":["Dawn","Light","Sun","Silver","Star","Grace","Gold","Sky"],"b":["bringer","bearer","song","ward","born","fall","herald","child"]},"epithet":{"pool":["Dawnbringer","the Radiant","Light-of-the-Fold","the Redeemed","Star-Touched"],"generic":true},"maxMid":1},"drow":{"label":"Drow","kind":"common","pre":["Vel","Ryn","Xar","Zz","Nym","Il","Vand","Ssz","Mal","Cor","Ael","Dris"],"mid":["ry","na","eth","za","in","rae","ol"],"suf":["ryn","eth","rae","yrr","za","ith","ael","oth","na"],"sufF":["rae","eth","yrr","ith","ynn","riel"],"sufM":["ryn","oth","ath","zar","ndril"],"seed":{"m":["Velryn","Xarath","Nymeth","Ilvandril","Malzar","Coroth","Drisym"],"f":["Xarra","Nymeth","Velyrr","Ilrae","Zzynn","Coriel","Aelith"],"n":["Vel","Xar","Nym","Zz"]},"surname":{"mode":"house","prefix":"Il'","a":["Vand","Zaeth","Xar","Nyl","Cor","Malric","Vel","Ssz"],"b":["ryl","eth","zar","une","yrr","oth","ael"]},"epithet":{"pool":["of the Deep","Spider-Kissed","the Exiled","Web-Weaver","the Nightblade"],"generic":true},"maxMid":1},"ratfolk":{"label":"Ratfolk","kind":"extended","pre":["Chit","Skar","Nix","Pib","Squ","Twit","Nib","Fik","Riss","Scur","Tik"],"mid":["ic","ow","it","ka","er","sk"],"suf":["ic","ow","it","tail","er","ka","sk","le","nose"],"seed":{"m":["Chittic","Skarrow","Pib","Fiksk","Twitler","Rissnose","Tikka"],"f":["Nixit","Squka","Nibble","Scurra","Pibbit","Twitka","Rissa"],"n":["Nix","Pib","Tik","Fik","Nib"]},"surname":{"mode":"compound","a":["Quick","Whisker","Scurry","Gnaw","Copper","Sharp","Sniff","Gutter"],"b":["tail","tooth","whisker","paw","snout","claw","penny","cheese"]},"epithet":{"pool":["Quicktail","the Scavenger","Sharp-Whisker","Penny-Finder","the Skittering"]},"maxMid":1},"catfolk":{"label":"Catfolk","kind":"extended","pre":["Rhas","Miu","Nef","Purr","Sa","Kesh","Ra","Nya","Sef","Tam","Zuri"],"mid":["sa","mi","ra","nu","she","ka"],"suf":["sa","u","ra","apple","l","kesh","mi","na","ket"],"seed":{"m":["Rhassa","Nef","Purrl","Keshra","Sefu","Tamir","Zuriket"],"f":["Miu","Nyasha","Rasha","Sefret","Zuri","Tamsa","Keshi"],"n":["Miu","Nef","Sa","Zuri"]},"surname":{"mode":"compound","a":["Sun","Sand","Night","Amber","Swift","Silk","Moon","Copper"],"b":["dapple","paw","whisker","prowl","stripe","tail","pounce","gaze"]},"epithet":{"pool":["Sundapple","the Prowler","Nine-Lives","Silk-Foot","the Curious"],"generic":true},"maxMid":1},"tengu":{"label":"Tengu","kind":"extended","maxMid":1,"pre":["Kara","Shi","Nib","Kaw","Tori","Sora","Yami","Ka","Ren","Hane"],"mid":["su","ka","ne","ru","shi"],"suf":["su","ka","ne","o","maru","ru","ha","dori"],"seed":{"m":["Karasu","Nibmaru","Kawaru","Sora","Yamibane","Renha"],"f":["Shika","Toriko","Haneru","Sorane","Kawa","Yamiko"],"n":["Kaw","Sora","Nib","Ren","Tori"]},"surname":{"mode":"none"},"epithet":{"pool":["Three-Feathers","the Trader","Black-Wing","Sharp-Eye","the Storm-Rider"],"descriptive":true}},"kitsune":{"label":"Kitsune","kind":"extended","pre":["Yu","Aka","Hoshi","Ren","Ki","Tsuki","Sa","Mi","Rei","Hana","Kaze"],"mid":["ki","ne","ko","ru","sa","na"],"suf":["ki","ko","ne","o","ka","mi","ne","na","ru"],"seed":{"m":["Renji","Kitsu","Tsukikage","Hoshiro","Kaze","Saito"],"f":["Yuki","Akane","Hoshiko","Hana","Reiko","Miya","Tsuki"],"n":["Yu","Ren","Ki","Rei","Kaze"]},"surname":{"mode":"pool","pool":["Tsukikage","Hoshimori","Akayama","Kazehana","Yukimura","Reidō","Shirafox"]},"epithet":{"pool":["Nine-Tails","the Trickster","Moonlit","Silver-Fox","the Beguiler"],"generic":true},"maxMid":1},"ifrit":{"label":"Ifrit (Fire)","kind":"planetouched","pre":["Cin","Azar","Nas","Emb","Pyr","Sol","Kal","Zar","Vul","Ash"],"mid":["ir","a","der","en","ra","ki"],"suf":["der","a","kin","ir","ra","um","esh","ash"],"seed":{"m":["Cinder","Azar","Nasir","Pyrenil","Solkin","Vulash","Kaldir"],"f":["Ember","Azara","Solra","Cindra","Pyra","Zarah","Ashka"],"n":["Cin","Azar","Ember","Sol"]},"surname":{"mode":"compound","a":["Ember","Ash","Flame","Cinder","Sun","Coal","Fire","Molten"],"b":["kin","born","heart","brand","soul","tongue","crown","step"]},"epithet":{"pool":["Emberkin","the Smoldering","Flame-Touched","Ash-Walker","the Kindled"],"generic":true},"maxMid":1},"oread":{"label":"Oread (Earth)","kind":"planetouched","pre":["Pet","Gor","Terra","Bould","Slate","Cair","Dun","Mag","Rax","Ston"],"mid":["ra","an","el","um","or","ka"],"suf":["ra","an","heart","um","or","stone","ka","mund"],"seed":{"m":["Goran","Cairn","Dunmar","Raxum","Boulderan","Slateor"],"f":["Petra","Terra","Magra","Cairel","Stonka","Duna"],"n":["Pet","Gor","Terra","Cairn"]},"surname":{"mode":"compound","a":["Stone","Granite","Iron","Deep","Mountain","Slate","Boulder","Earth"],"b":["heart","born","brow","fist","root","shard","spine","step"]},"epithet":{"pool":["Stoneheart","the Unmoved","Deep-Rooted","Mountain-Born","the Steadfast"],"generic":true},"maxMid":1},"sylph":{"label":"Sylph (Air)","kind":"planetouched","pre":["Zeph","Aeo","Wisp","Cae","Nim","Sil","Aur","Vael","Ael","Bre"],"mid":["y","ra","li","el","a","wi"],"suf":["ra","lus","wind","el","a","ith","yra","ael","breeze"],"seed":{"m":["Aeolus","Zephyros","Caelwin","Nimir","Vaelar","Silfen"],"f":["Zephyra","Wisp","Aeliana","Silra","Breeze","Nimra"],"n":["Wisp","Zeph","Ael","Bre"]},"surname":{"mode":"compound","a":["Sky","Storm","Cloud","Wind","Zephyr","Gale","High","Whisper"],"b":["dancer","song","step","chaser","born","whisper","rider","breath"]},"epithet":{"pool":["Wind-Dancer","the Fleeting","Cloud-Born","Storm-Chaser","the Whispering"],"generic":true},"maxMid":1},"undine":{"label":"Undine (Water)","kind":"planetouched","pre":["Mar","Ner","Cor","Tid","Del","Mira","Lun","Aqu","Bry","Coral"],"mid":["is","a","ida","al","en","ri"],"suf":["is","ida","al","current","a","mer","ine","wave","tide"],"seed":{"m":["Maris","Coral","Delmar","Bryn","Nerion","Aquel"],"f":["Nerida","Mira","Lunara","Coralind","Marisa","Brya"],"n":["Mar","Ner","Tide","Bry"]},"surname":{"mode":"compound","a":["Deep","Tide","Sea","Coral","Salt","Wave","Pearl","River"],"b":["current","song","born","glimmer","tide","reach","foam","depth"]},"epithet":{"pool":["Deepcurrent","the Tidewalker","Salt-Kissed","Pearl-Eyed","the Flowing"],"generic":true},"maxMid":1},"nagaji":{"label":"Nagaji","kind":"extended","pre":["Ssa","Nag","Vish","Hass","Zhar","Ssur","Kael","Ophi","Ssyl","Vor"],"mid":["na","ka","ri","tha","ssi","zar"],"suf":["na","ka","ri","tha","ssa","zar","dra","ith"],"seed":{"m":["Ssarnaga","Zhardra","Hasska","Vorith","Kaelzar","Ophira"],"f":["Ssyltha","Naga","Vishri","Ssurna","Zharka","Ophissa"],"n":["Ssa","Nag","Vor","Kael"]},"surname":{"mode":"none"},"epithet":{"pool":["the Scaled","Coil-of-Iron","Serpent-Eyed","the Venomous","Cold-Blood"],"generic":true},"maxMid":1},"vanara":{"label":"Vanara","kind":"extended","pre":["Hanu","Bala","Kesh","Ravi","Tara","Vin","Nala","Gan","Suri","Amba"],"mid":["man","ra","va","ni","da","sha"],"suf":["man","ra","va","ni","esh","da","an","ika"],"seed":{"m":["Hanuman","Balava","Keshan","Ravidan","Vinesh","Ganra"],"f":["Tara","Nalika","Suri","Ambika","Ravina","Keshva"],"n":["Ravi","Tara","Vin","Suri"]},"surname":{"mode":"none"},"epithet":{"pool":["the Leaper","Swift-Branch","the Mischievous","High-Canopy","the Clever"],"generic":true},"maxMid":1},"samsaran":{"label":"Samsaran","kind":"extended","pre":["Sam","Aru","Mai","Ten","Kir","Nir","Vasu","Aya","Sen","Chan"],"mid":["sa","ra","na","tri","ya","dh"],"suf":["ra","na","tri","ya","dha","sen","in","ika"],"seed":{"m":["Samsan","Arudh","Tenzin","Kirin","Vasudha","Chandra"],"f":["Maitri","Ayana","Nirya","Senika","Aruna","Kirya"],"n":["Aru","Ten","Kir","Sen"]},"surname":{"mode":"none"},"epithet":{"pool":["the Reborn","Many-Lived","the Serene","Memory-Keeper","the Ageless"],"generic":true},"maxMid":1},"strix":{"label":"Strix","kind":"extended","maxMid":1,"pre":["Nok","Vesp","Umbr","Cor","Nyx","Strig","Mor","Aves","Tal","Rax"],"mid":["a","er","ix","ul"," or"],"suf":["a","ix","us","or","al","en","ra","yx"],"seed":{"m":["Nokta","Vesper","Umbros","Corvyx","Strigal","Raxen"],"f":["Nyxa","Vespera","Umbra","Coral","Morix","Talyx"],"n":["Nok","Nyx","Cor","Rax"]},"surname":{"mode":"none"},"epithet":{"pool":["Night-Wing","the Silent","Shadow-of-the-Cliff","Blood-Feather","the Vengeful"],"descriptive":true}},"grippli":{"label":"Grippli","kind":"extended","pre":["Bip","Rib","Kek","Nim","Pob","Tik","Glib","Wex","Cro","Zib"],"mid":["it","o","ka","el","ub"],"suf":["it","o","ka","el","ub","bit","le","na"],"seed":{"m":["Bipit","Kekbit","Poblo","Glibka","Wexo","Croak"],"f":["Ribna","Nimka","Tikel","Zibna","Pobel","Wexit"],"n":["Bip","Rib","Tik","Wex","Zib"]},"surname":{"mode":"none"},"epithet":{"pool":["the Leaper","Reed-Hopper","Bright-Toe","the Marsh-Singer","Fly-Catcher"]},"maxMid":1},"vishkanya":{"label":"Vishkanya","kind":"extended","pre":["Vish","Naga","Anu","Sar","Ophi","Zeh","Kaa","Nila","Sura","Yav"],"mid":["ka","na","ri","vi","sha","li"],"suf":["nya","ka","ri","vi","sha","li","na","vati"],"seed":{"m":["Vishan","Saroth","Kaaved","Zehri","Ophidan","Yavris"],"f":["Vishkanya","Nilavati","Anusha","Surika","Kaali","Zehra"],"n":["Vish","Sar","Kaa","Yav"]},"surname":{"mode":"none"},"epithet":{"pool":["Poison-Kiss","the Silk-Blade","Serpent-Grace","the Alluring","Venom-Touched"],"generic":true},"maxMid":1},"dhampir":{"label":"Dhampir","kind":"extended","hybridOf":["human"],"pre":["Vale","Mor","Ceph","Adr","Luc","Noct","Sanguin","Vil","Cas","Ren"],"mid":["ri","an","el","ia","or","in"],"suf":["ian","el","or","a","ius","eth","ora","is"],"seed":{"m":["Valen","Morien","Cephan","Adrius","Nocteth","Vilor"],"f":["Cassoria","Adriel","Morwen","Lucia","Nocta","Sanguine"],"n":["Vale","Mor","Ren","Cas"]},"surname":{"mode":"human"},"epithet":{"pool":["the Half-Dead","Pale-Blood","the Nightborn","Grave-Kissed","the Sanguine"],"generic":true},"maxMid":1},"fetchling":{"label":"Fetchling","kind":"extended","pre":[" Shae","Umbr","Duskan","Vesh","Nocturn","Grey","Shad","Ecl","Vael","Cin"],"mid":["a","en","or","el","ra","in"],"suf":["a","en","or","el","ora","ith","us","yn"],"seed":{"m":["Umbren","Duskan","Veshor","Vaelin","Cinor","Eclyn"],"f":["Shaera","Umbra","Nocturna","Veshra","Greyel","Cindra"],"n":["Vesh","Umbr","Grey","Cin"]},"surname":{"mode":"compound","a":["Dusk","Shadow","Grey","Umbra","Twilight","Ash","Night","Veil"],"b":["walker","born","step","weave","fall","whisper","shroud","gaze"]},"epithet":{"pool":["Shadow-Walker","the Veiled","Dusk-Born","the Between","Grey-Eyed"],"generic":true},"maxMid":1},"changeling":{"label":"Changeling","kind":"extended","pre":["Mor","Vel","Sile","Grim","Ash","Rowan","Mist","Elke","Nara","Sori"],"mid":["a","en","el","ra","wyn","ia"],"suf":["a","wen","el","ra","wyn","eth","ora","is"],"seed":{"m":["Morwen","Velan","Grimel","Ashen","Narael","Soren"],"f":["Morgause","Sileth","Elke","Mistra","Rowena","Naria"],"n":["Mist","Ash","Vel","Sori"]},"surname":{"mode":"none"},"epithet":{"pool":["the Foundling","Hag-Daughter","the Two-Faced","Green-Eyed","the Whispered-To"],"generic":true},"maxMid":1},"skinwalker":{"label":"Skinwalker","kind":"extended","hybridOf":["human"],"pre":["Bjor","Kel","Var","Hald","Sig","Ur","Mora","Ren","Ott","Grim"],"mid":["a","an","gr","und","or","hild"],"suf":["a","und","gar","hild","na","or","olf","rid"],"seed":{"m":["Bjorgar","Kelund","Varolf","Haldan","Urgrim","Ottar"],"f":["Morhild","Signa","Varka","Renna","Astrid","Ulfhild"],"n":["Bjor","Var","Ren","Grim"]},"surname":{"mode":"compound","a":["Wolf","Bear","Blood","Moon","Night","Fell","Grey","Fang"],"b":["skin","pelt","howl","hide","born","mark","claw","kin"]},"epithet":{"pool":["Wolf-Kin","the Two-Skinned","Moon-Marked","Fell-Blooded","the Prowling"],"generic":true},"maxMid":1},"suli":{"label":"Suli","kind":"extended","pre":["Suli","Jan","Zah","Rami","Nur","Kal","Fah","Vasi","Oma","Lael"],"mid":["ra","di","na","el","im","ka"],"suf":["ra","di","na","el","im","ka","ne","ah"],"seed":{"m":["Janir","Ramil","Kalim","Fahran","Vasim","Omael"],"f":["Sulina","Zahra","Nura","Laela","Ramika","Janel"],"n":["Suli","Nur","Kal","Oma"]},"surname":{"mode":"nisba","prefix":"al-","bases":["Jinn","Karim","Nur","Fahran","Vasim","Zahir"]},"epithet":{"pool":["the Four-Winds","Jinn-Blooded","the Elemental","Storm-and-Ember","the Untamed"],"generic":true},"maxMid":1},"wayang":{"label":"Wayang","kind":"extended","pre":["Bay","Sang","Nir","Wulan","Lem","Kala","Sur","Anta","Bima","Teja"],"mid":["a","an","u","ya","ra","ka"],"suf":["ang","u","ya","a","ka","ra","na","yang"],"seed":{"m":["Bayang","Niru","Lembayu","Suraka","Antara","Bima"],"f":["Wulan","Sangya","Kala","Tejara","Niraya","Suryani"],"n":["Bay","Nir","Kala","Teja"]},"surname":{"mode":"none"},"epithet":{"pool":["the Shadow-Cast","Dusk-Child","the Unseen","Umbral","the Quiet-Step"],"generic":true},"maxMid":1}},"epithets":{"generic":["the Bold","the Grim","the Wise","the Swift","the Quiet","the Elder","the Younger","the Red","the Grey","the Pale","the Bright","the Cruel","the Kind","the Lucky","the Lost","the Nameless","the Tall","the Small","the Fierce","the Patient","the Wanderer","the Undaunted","the Twice-Born","the Sleepless","the Iron-Willed"],"compound":{"a":["Iron","Storm","Ash","Blood","Stone","Grim","Bright","Night","Dawn","Frost","Ember","Shadow","Bone","Oath","Red","Black","Wolf","Raven","Thorn","Gold"],"b":["jaw","born","heart","hand","fang","brand","song","wind","mane","fist","eye","tongue","step","bane","watch","vein","claw","tide","scar","blade"]},"places":["of the Ashfen","of the High Pass","of the Broken Vale","of the Salt Marsh","of the Ninth Ward","of the Ember Coast","of the Low Fields","of the Old Road","of the Sunken Wood","of the Iron Hills","of the Weeping Moor","of the Far Reach"]},"blocklist":["valeros","seoni","merisiel","kyra","ezren","harsk","lem","lini","amiri","sajan","seelah","fumbus","seltyiel","feiya","damiel","alahazra","imrijka","kess","enora","quinn","oloch","crowe","hayato","jirelle","estra","alain","balazar","adowyn","shardra","zadim","urgraz","yoon","drizzt","do'urden","elminster","mordenkainen","tasha","bigby","strahd","raistlin","beholder","gauth","mind flayer","illithid","githyanki","githzerai","displacer beast","carrion crawler","umber hulk","slaad","yuan-ti","kuo-toa","hook horror","menzoberranzan","waterdeep","hobbit","balrog","gandalf","aragorn","frodo","bilbo","baggins","legolas","galadriel","gimli","thorin","gollum","sauron","mordor","gondor","erebor","rivendell","shire","middle-earth","numenor","silmaril"],"version":"1.0.0"};if(typeof globalThis!=="undefined")globalThis.NAMEFORGE_DATA=__DATA__;})();
/* ============================================================================
 * NameForge — race-aware fantasy name generator (engine)
 * ----------------------------------------------------------------------------
 * Dependency-free. Works as an ES/CommonJS module OR a browser global.
 *   Browser:  <script src="data.js"></script><script src="nameforge.js"></script>
 *             NameForge.generate({ race:"elf", count:5 })
 *   Node:     const NameForge = require("./nameforge.js")
 *   ESM:      import NameForge from "./nameforge.esm.js"  (see README)
 *
 * All output is procedurally generated or drawn from original generic seed
 * pools, then filtered against a blocklist of trademarked / Product-Identity
 * names — so generated names carry no copyright and never emit a protected name.
 * ==========================================================================*/
(function (root, factory) {
  var DATA = (typeof globalThis !== "undefined" && globalThis.NAMEFORGE_DATA) ? globalThis.NAMEFORGE_DATA : root.NAMEFORGE_DATA;
  var api = factory(DATA);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NameForge = api;
})(typeof self !== "undefined" ? self : this, function (DATA) {
"use strict";

if (!DATA) throw new Error("NameForge: data not found — load data.js first.");
var RACES = DATA.races, EP = DATA.epithets, BLOCK = DATA.blocklist;
var BLOCKSET = {}; BLOCK.forEach(function (b) { BLOCKSET[b.toLowerCase()] = 1; });

/* ---- seedable RNG (Mulberry32) so results are reproducible on demand ----- */
function hashStr(s) { var h = 1779033703 ^ s.length; for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---- small helpers ------------------------------------------------------- */
function cap(s) { s = String(s).trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function tidy(s) {
  return String(s).replace(/\s+/g, "")                 // procedural tokens never contain spaces
                  .replace(/(.)\1\1+/gi, "$1$1")        // collapse 3+ repeats -> 2 (deterministic)
                  .replace(/([bcdfghjklmnpqrstvwxz])\1(?=[bcdfghjklmnpqrstvwxz])/gi, "$1"); // no doubled consonant before another consonant
}
function normGender(g) {
  g = (g || "any").toLowerCase();
  if (g === "m" || g === "male") return "m";
  if (g === "f" || g === "female") return "f";
  if (g === "n" || g === "neutral" || g === "nb" || g === "nonbinary") return "n";
  return "any";
}

function makeRng(seed, salt) {
  if (seed == null) return Math.random;
  return mulberry32((hashStr(String(seed)) ^ (salt || 0)) >>> 0);
}

/* ---- config resolution (human is culture-driven) ------------------------- */
function resolveConfig(raceKey, culture, rng) {
  var r = RACES[raceKey];
  if (!r) throw new Error("NameForge: unknown race '" + raceKey + "'");
  if (r.cultures) {
    var keys = Object.keys(r.cultures);
    var ck = (culture && r.cultures[culture]) ? culture : keys[(rng() * keys.length) | 0];
    var cfg = r.cultures[ck];
    return { cfg: cfg, race: r, cultureKey: ck, cultureLabel: cfg.label };
  }
  return { cfg: r, race: r, cultureKey: null, cultureLabel: null };
}

/* ---- given-name builders ------------------------------------------------- */
function pick(arr, rng) { return arr[(rng() * arr.length) | 0]; }

function pickDistinct(pool, prev, rng) {          // avoid repeating the previous syllable
  var s = pick(pool, rng), t = 0, key = function (x) { return String(x).trim().toLowerCase(); };
  while (t++ < 4 && prev && key(s) === key(prev)) s = pick(pool, rng);
  return s;
}
function synth(cfg, gender, rng) {
  var parts = [pick(cfg.pre, rng)];
  var mid = cfg.mid || [], maxMid = cfg.maxMid == null ? 1 : cfg.maxMid;
  var nMid = maxMid ? (rng() * (maxMid + 1)) | 0 : 0;
  for (var i = 0; i < nMid && mid.length; i++) parts.push(pickDistinct(mid, parts[parts.length - 1], rng));
  var sufPool = cfg.suf || [""];
  if (gender === "m" && cfg.sufM) sufPool = cfg.sufM;
  else if (gender === "f" && cfg.sufF) sufPool = cfg.sufF;
  parts.push(pickDistinct(sufPool, parts[parts.length - 1], rng));
  var out = cap(tidy(parts.join("")));
  if (!/[aeiouy]/i.test(out)) out += pick(["a", "i", "o", "e"], rng);   // guarantee a vowel
  return out;
}

function curatedGiven(cfg, gender, rng) {
  var seed = cfg.seed; if (!seed) return null;
  var pool;
  if (gender === "m") pool = seed.m;
  else if (gender === "f") pool = seed.f;
  else if (gender === "n") pool = seed.n && seed.n.length ? seed.n : (seed.m || []).concat(seed.f || []);
  else pool = (seed.m || []).concat(seed.f || [], seed.n || []);
  return (pool && pool.length) ? pick(pool, rng) : null;
}

function givenName(cfg, race, gender, mode, rng) {
  // virtue/aspiration names for tiefling & aasimar
  if (race.virtues && (gender === "n" || gender === "any") && rng() < 0.18) return pick(race.virtues, rng);
  if (mode === "curated") { var c = curatedGiven(cfg, gender, rng); if (c) return c; return synth(cfg, gender, rng); }
  if (mode === "procedural") return synth(cfg, gender, rng);
  // mixed: favor curated when seeds exist, else procedural
  if (cfg.seed && rng() < 0.5) { var g = curatedGiven(cfg, gender, rng); if (g) return g; }
  return synth(cfg, gender, rng);
}

/* ---- surname / clan builders --------------------------------------------- */
function buildSurname(cfg, race, gender, rng, ctx) {
  var s = cfg.surname || race.surname || { mode: "none" };
  switch (s.mode) {
    case "compound": {
      var a = cap(pick(s.a, rng)), b = pick(s.b, rng);
      if (s.join) return s.join + a + " " + cap(b);          // e.g. "of the Iron Company"
      return a + b.toLowerCase();                            // e.g. "Ironfist"
    }
    case "patronymic": {
      var base = pick(s.bases, rng);
      var g = gender === "f" ? "f" : (gender === "m" ? "m" : (rng() < 0.5 ? "m" : "f"));
      return base + (g === "f" ? s.suffixF : s.suffixM);     // "Halsdottir" / "Halsson"
    }
    case "nisba":  return s.prefix + cap(pick(s.bases, rng)); // "al-Karim"
    case "suffix": {
      var g2 = gender === "f" ? "f" : (gender === "m" ? "m" : (rng() < 0.5 ? "m" : "f"));
      return cap(pick(s.bases, rng)) + (g2 === "f" ? s.suffixF : s.suffixM); // "Voranova"
    }
    case "pool":   return pick(s.pool, rng);
    case "house":  return s.prefix + cap(pick(s.a, rng)) + pick(s.b, rng);   // "Il'Vandryl"
    case "descriptive": return descriptive(race, rng);
    case "human":  return buildSurname(RACES.human.cultures.generic, RACES.human, gender, rng); // dhampir/skinwalker
    case "pick2": {
      var rk = pick(s.from, rng);
      return buildSurname(RACES[rk], RACES[rk], gender, rng, ctx);
    }
    default: return null;
  }
}

function descriptive(race, rng) {
  var ep = race.epithet || {};
  if (ep.pool && ep.pool.length) return pick(ep.pool, rng);
  return pick(EP.generic, rng);
}

/* ---- epithet builders ---------------------------------------------------- */
function buildEpithet(race, rng) {
  var ep = race.epithet || {};
  var sources = [];
  if (ep.pool && ep.pool.length) { sources.push("pool"); if (ep.descriptive) sources.push("pool"); } // weight deed-names
  if (ep.generic !== false) { sources.push("generic", "compound", "place"); }
  if (!sources.length) sources = ["generic", "compound"];
  switch (pick(sources, rng)) {
    case "pool":     return pick(ep.pool, rng);
    case "generic":  return pick(EP.generic, rng);
    case "compound": return cap(pick(EP.compound.a, rng)) + pick(EP.compound.b, rng).toLowerCase();
    case "place":    return pick(EP.places, rng);
  }
}

/* ---- blocklist guard ----------------------------------------------------- */
function isBlocked(parts) {
  for (var i = 0; i < parts.length; i++) {
    var p = String(parts[i] || "").toLowerCase();
    if (!p) continue;
    // exact token hits
    var toks = p.split(/[\s'\-]+/);
    for (var j = 0; j < toks.length; j++) if (BLOCKSET[toks[j]]) return true;
    // multi-word mark as substring
    for (var b in BLOCKSET) if (b.indexOf(" ") >= 0 && p.indexOf(b) >= 0) return true;
  }
  return false;
}

/* ---- one name ------------------------------------------------------------ */
function makeOne(opts, rng) {
  var res = resolveConfig(opts.race, opts.culture, rng);
  var cfg = res.cfg, race = res.race;
  var gender = opts.gender;
  var g = gender === "any" ? (rng() < 0.5 ? "m" : "f") : gender; // pick a concrete gender for name-shaping if 'any'

  var first, surname = null, epithet = null, tries = 0;
  do {
    first = givenName(cfg, race, gender === "any" ? g : gender, opts.mode, rng);
  } while (isBlocked([first]) && ++tries < 12);

  if (opts.surname) {
    tries = 0;
    do { surname = buildSurname(cfg, race, gender === "any" ? g : gender, rng, res); }
    while (surname && isBlocked([surname]) && ++tries < 8);
  }
  if (opts.epithet) {
    tries = 0;
    do { epithet = buildEpithet(race, rng); }
    while (epithet && isBlocked([epithet]) && ++tries < 8);
  }

  var full = [first, surname, epithet].filter(Boolean).join(" ");
  return {
    first: first,
    surname: surname || null,
    epithet: epithet || null,
    full: full,
    race: opts.race,
    raceLabel: race.label,
    gender: gender === "any" ? g : gender,
    culture: res.cultureKey,
    cultureLabel: res.cultureLabel
  };
}

/* ---- public API ---------------------------------------------------------- */
function generate(opts) {
  opts = opts || {};
  var o = {
    race: opts.race || "human",
    gender: normGender(opts.gender),
    culture: opts.culture || null,
    count: Math.max(1, Math.min(500, opts.count || 1)),
    mode: (["mixed", "curated", "procedural"].indexOf(opts.mode) >= 0) ? opts.mode : "mixed",
    surname: !!opts.surname,
    epithet: !!opts.epithet
  };
  if (!RACES[o.race]) throw new Error("NameForge: unknown race '" + o.race + "'. See NameForge.races().");
  var out = [], seen = {};
  for (var i = 0; i < o.count; i++) {
    var rng = makeRng(opts.seed, opts.seed == null ? 0 : (i * 2654435761));
    var n, guard = 0;
    do { n = makeOne(o, rng); } while (seen[n.full] && ++guard < 6);
    seen[n.full] = 1;
    out.push(n);
  }
  return out;
}

/* convenience singles */
function one(race, gender, extra) { return generate(Object.assign({ race: race, gender: gender, count: 1 }, extra || {}))[0]; }

/* introspection for building UIs / dropdowns */
function races() { return Object.keys(RACES).map(function (k) { return { key: k, label: RACES[k].label, kind: RACES[k].kind || "other", cultured: !!RACES[k].cultures }; }); }
function raceInfo(key) { var r = RACES[key]; if (!r) return null; return { key: key, label: r.label, kind: r.kind, cultures: r.cultures ? Object.keys(r.cultures).map(function (c) { return { key: c, label: r.cultures[c].label }; }) : null }; }
function humanCultures() { return Object.keys(RACES.human.cultures).map(function (c) { return { key: c, label: RACES.human.cultures[c].label }; }); }
function addToBlocklist(names) { (Array.isArray(names) ? names : [names]).forEach(function (n) { BLOCKSET[String(n).toLowerCase()] = 1; }); }

return {
  generate: generate,
  one: one,
  races: races,
  raceInfo: raceInfo,
  humanCultures: humanCultures,
  addToBlocklist: addToBlocklist,
  version: DATA.version || "1.0.0"
};
});
