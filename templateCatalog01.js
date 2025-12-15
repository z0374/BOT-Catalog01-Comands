// Localização Conceitual: /bot/comands/templateCatalog01.js

// Importações de Módulos (Assumindo a estrutura de diretórios do repositório)
import { loadUserState, saveUserState } from "../../src/db/session.js";
import { dataSave, dataExist, dataRead } from "../../src/db/D1.js";
import { sendMessage, sendCallBackMessage, sendMidia } from "../../src/utils/message.js";
import { normalize, brMap, BRL } from "../../src/utils/formatters.js";
import { image } from "../../src/utils/arquives.js"; // Função 'image' agora requer 4 argumentos (fileId, name, mimeType, env, chatId)
import { downloadGdrive } from "../../src/services/gDrive.js";
import { yesOrNo } from "../../src/services/webhook.js";

export const comandTemplateCatalog01 = "templateCatalog01"
    const indent = ' ';
    const separator = "------------------------------"
// -----------------------------------------------------------------------------
// FUNÇÕES MODULARES DE FLUXO (STATE HANDLERS)
// -----------------------------------------------------------------------------

async function handleItensMenuFlow(userState, messageText, userId, chatId, userName, update, env) {
                const categories = await dataRead("products", { type: "categoryProductMenu" }, env, chatId);
                let categoriesList = " ";
                let itemsList;
                const usersItemList = ['Atualizar_itemsMenu'];
                const comand = messageText.split("_");

                //await sendCallBackMessage("Categorias recuperadas: " + JSON.stringify(categories), chatId,env);
                if(categories?.data || !normalize(messageText).includes(normalize("itemsmenu"))){
                    //await sendCallBackMessage("Entrou no if", chatId, env);
                    const categoriesData = categories?.data ? (categories.data).split(',').map(f => f.trim()):"";
                    if(usersItemList.indexOf(messageText) || usersItemList.indexOf(userState.state)){
                        const allItems = await dataRead("products", null, env, chatId);
                        for (const v of categoriesData) {
                            const itemsByCategories = allItems.flat().filter(obj => String(obj["type"]) === String(v));
                            itemsList += "\n<b>"+ normalize(v) +"</b>\n";
                                for(const i of itemsByCategories){
                                    const nameItems = await dataRead("assets", {id: (i.data.split(','))[0]}, env);
                                        //await sendCallBackMessage(`Callback nameItems : ${JSON.stringify(nameItems)} | ${(i.data.split(','))[0]}`, chatId, env);
                                            itemsList += `${indent} /` + normalize(nameItems.data) + `_itemsMenu\n`;
                                }
                                //await sendCallBackMessage(`debug v : ${normalize(v)}`, chatId, env);
                            categoriesList += v !== undefined ? "\n" + indent + "\n/" + normalize(v) + "_ver_itemsMenu":"";
                        }
                        }else{
                            if(comand.length > 2 && usersItemList.includes((comand.slice(1)).join("_"))){
                                messageText = comand.slice(1).join("_");
                            }else{
                                for (const v of categoriesData) {
                                    categoriesList += v !== undefined ? "\n" + indent + "\n/" + normalize(v) + "_ver_itemsMenu":"";
                                }
                        }
                    }

                    //await sendCallBackMessage(categories.data + ' - ' + categoriesList + ' - ' + userState.state,chatId,env);
                }else{
                    userState.procesCont = 0;
                    userState.proces = comandTemplateCatalog01;
                    userState.state = 'waiting_start_itemsmenu';
                }
                
                
    switch (normalize(messageText)) {
        case normalize("Adicionar_itemsMenu"):
            userState.procesCont = 0;
            userState.state = 'waiting_start_itemsmenu';
            break;

        case normalize("Atualizar_itemsMenu"):
            userState.procesCont = 0;
            userState.state = 'waiting_update_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Sr. ${userName}, por gentileza escolha pelo nome qual item deseja Atualizar:\n${itemsList}`);
            break;

        case normalize("Ver_itemsMenu"):
            console.log("ver Items - entrou")
            userState.procesCont = 0;
            userState = null;
            await saveUserState(env, userId, userState);
            const productsVizualization = (await dataRead('products', {type: comand[0]}, env));
            await sendMessage(`Sr. ${userName},\nSegue em cards os items da categoria ${comand[0]}`, chatId, env);
                for(const v of productsVizualization){
                const messageVizualization = [];
                    for(const i of (v.data).split(",")){
                        const assetsVizualization = await dataRead('assets', {id: i}, env);
                        messageVizualization.push(assetsVizualization.data);
                    }
                        const finalMessage = `Categoria: ${comand[0]}\n\nProduto: <b>${messageVizualization[0]}</b>\nDescrição: ${messageVizualization[2]}\n\nPreço: ${messageVizualization[3]}`;
                        await sendMidia([messageVizualization[0], finalMessage], chatId, env);
                }
            break;
    
        default:
            break;
    }
    switch (normalize(userState.state)) {
        case normalize('waiting_section_itemsmenu'):
            userState.procesCont = 0;
            userState.state = 'waiting_comand_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Olá sr. ${userName}!\n O que o sr. deseja?\n/Adicionar_itemsMenu${indent}|${indent}/Ver_ItemsMenu\n\n/Atualizar_itemsMenu${indent}|${indent}/Remover_itemsMenu \n${separator} | /encerrar\nVer por categoria!${categoriesList}`, chatId, env);
            break;

        case normalize('waiting_start_itemsmenu'):
            userState.procesCont = 0;
            userState.state = 'waiting_name_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Saudações sr. ${userName}!\n Iremos, então adicionar um novo item ao seu cardápio, comece me informando o nome do item\n .:`, chatId, env);
            break;

        case normalize('waiting_name_itemsmenu'):
            userState.procesCont = 0;
            const nameItemsMenu = [messageText, 'text'];
            userState.select.push(nameItemsMenu);
            userState.state = 'waiting_image_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Saudações sr. ${userName}!\n Agora me envie a imagem do item.:`, chatId, env);
            break;

        case normalize('waiting_image_itemsmenu'):
            userState.procesCont = 0;
            const agoraItemsMenu = new Date();
            let itemMenuFileId, itemMenuMimeType;

            // 1. Extração de File ID e MIME Type da mensagem de entrada (Apenas Imagem)
            if (update.message?.document && update.message.document.mime_type.startsWith('image/')) {
                itemMenuFileId = update.message.document.file_id;
                itemMenuMimeType = update.message.document.mime_type;
            } else if (update.message?.photo) {
                itemMenuFileId = update.message.photo.pop().file_id;
                itemMenuMimeType = 'image/jpeg';
            } else {
                await sendMessage('Por favor, envie uma imagem válida para o item do menu.', chatId, env);
                return new Response('OK');
            }

            const nameImageItemMenu = userState.select[0][0] + await normalize(agoraItemsMenu.toISOString().split('T')[0].replace(/-/g, '') + agoraItemsMenu.getMinutes().toString().padStart(2, '0'));

            try {
                // 2. Chamada corrigida para 'image' com o MIME Type
                const imgId = await image(itemMenuFileId, nameImageItemMenu, itemMenuMimeType, env, chatId);
                const imageItemMenu = [imgId, "img"];
                userState.select.push(imageItemMenu);
            } catch (error) {
                return new Response('OK');
            }

            userState.state = 'waiting_description_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Saudações sr. ${userName}!\n Me passa agora a introdução dos e ou os ingredientes do item.:\n(digite "-" caso não queira colocar)`, chatId, env);
            break;

        case normalize('waiting_description_itemsmenu'):
            userState.procesCont = 0;
            if (messageText == '-') { messageText = ''; }
            userState.texto = messageText;
            userState.state = 'waiting_stuff_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Saudações sr. ${userName}!\n Por favor,\n separando-os por "," informe os ingredientes do item.:\n(digite "-" caso não queira colocar)`, chatId, env);
            break;

        case normalize('waiting_stuff_itemsmenu'):
            userState.procesCont = 0;
            if (messageText == '-') { messageText = ''; }
            else {
                userState.texto += ': ' + messageText.replace(/,/g, ' |br| ');
            }

            const descItemMenu = [userState.texto, 'text']
            userState.select.push(descItemMenu);
            userState.state = 'waiting_category_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Saudações sr. ${userName}!\n Por favor, informe em qual categoria seu produto se encaixa.:`, chatId, env);
            break;

        case normalize('waiting_category_itemsmenu'):
            userState.procesCont = 0;
            userState.select.push([messageText, 'categoryProductMenu']);
            userState.state = 'waiting_value_itemsmenu';
            await saveUserState(env, userId, userState);
            await sendMessage(`Saudações sr. ${userName}!\n Por fim me informe o preço do item.:`, chatId, env);
            break;

        case normalize('waiting_value_itemsmenu'):
            userState.procesCont = 0;
            const valorItemMenu = [messageText, 'text'];
            userState.select.push(valorItemMenu);
            userState.state = 'waiting_confirm_itemsmenu';
            await saveUserState(env, userId, userState);
            const dataItemId = userState.select;
            const nomItemMenu = dataItemId[0][0];
            const imgItemMenuFileId = dataItemId[1][0];
            const desItemMenu = dataItemId[2][0];
            const ctgItemMenu = dataItemId[3][0] || 'Outros';
            const vlrItemMenu = dataItemId[4][0];

            // Download para visualização:
            const imgItemMenu = await downloadGdrive(imgItemMenuFileId, env, chatId)

            const msgItemMenu = `Categoria: ${ctgItemMenu}\n\nProduto: ${nomItemMenu}\nDescrição: ${desItemMenu.replace(/\|br\|/g, ', ')}\nPreço: ${BRL(vlrItemMenu)}\n\n .......................`;
            await sendMidia([imgItemMenu, msgItemMenu], chatId, env);
            await sendMessage(`Saudações sr. ${userName}!\n Confirme por gentileza se esta correto.:\n /SIM | /NAO`, chatId, env);
            break;

        case normalize('waiting_confirm_itemsmenu'):
            userState.procesCont = 0;
            let dataItemsMenu = '';
            let categoryItemsMenu = '';

            if (normalize(messageText) == normalize('sim')) {
                const itemsMenu = userState.select;

                // --- 1. Lógica de Categorias (Leitura e Atualização) ---
                try {
                    const exctgrItemMenu = await dataRead('products', ['type', 'categoryProductMenu'], env);

                    if (exctgrItemMenu && exctgrItemMenu.data) {
                        // Se categorias existentes foram encontradas:

                        let vlrExctgrItemMenu = (exctgrItemMenu.data).split(',').map(f => f.trim());
                        if (!vlrExctgrItemMenu.includes(itemsMenu[3][0])) {
                            vlrExctgrItemMenu.push(itemsMenu[3][0]);
                            // ATUALIZA a lista de categorias usando updateData()
                            await updateData([(vlrExctgrItemMenu.join(',')), 'categoryProductMenu'], ['products', 'data, type'], env, chatId);
                            categoryItemsMenu = itemsMenu[3][0];
                        } else {
                            categoryItemsMenu = itemsMenu[3][0];
                        }
                    } else {
                        // INSERE a primeira categoria usando dataSave()
                        await dataSave(itemsMenu[3], ['products', 'data, type'], env, chatId);
                        categoryItemsMenu = itemsMenu[3][0];
                    }
                } catch (error) {
                    const logErro = 'Erro ao salvar/atualizar categoria do item do menu. Detalhe: ' + error.message;
                    await sendCallBackMessage(logErro, chatId, env);
                    throw new Error(logErro); // Propaga a falha de persistência
                }

                // --- 2. Salvamento dos Assets do Item de Menu (Inserção) ---
                try {
                    // SALVA os assets individuais (Nome, Imagem, Descrição, Valor) usando dataSave()
                    dataItemsMenu = String(await dataSave(itemsMenu[0], ['assets', 'data, type'], env, chatId));
                    dataItemsMenu += ',' + String(await dataSave(itemsMenu[1], ['assets', 'data, type'], env, chatId));
                    dataItemsMenu += ',' + String(await dataSave(itemsMenu[2], ['assets', 'data, type'], env, chatId));
                    dataItemsMenu += ',' + String(await dataSave(itemsMenu[4], ['assets', 'data, type'], env, chatId));

                } catch (error) {
                    const logErro = 'Erro ao salvar assets do item do menu. Detalhe: ' + error.message;
                    await sendCallBackMessage(logErro, chatId, env);
                    throw new Error(logErro); // Propaga a falha de persistência
                }
            }

            // 3. Persistência Final do Produto (Armazena a lista de IDs no D1 através de yesOrNo)
            return await yesOrNo([dataItemsMenu, String(categoryItemsMenu)], ['products', 'data,type'], userId, chatId, userState, messageText, env);

            default:
                
                break;
    }
    return new Response('OK');
}

async function handleConfiguracaoFlow(userState, messageText, userId, chatId, userName, update, env) {
    const configIndex = ['Nome', 'Tel', 'Cep', 'Rua', 'Bairro', 'Num', 'Cidade', 'Uf', 'Complemento', 'Descrição', 'PrimColor', 'SecdColor'];
    const messageBreak = messageText.includes('_') ? (messageText.toLowerCase()).split('_') : messageText;
    const configData = (await dataRead('config', { type: 'general' }, env))[0];
    const _configData = configData?.data ? (configData.data).split('-|-') : []

    if (messageBreak[0] == 'atualizar') userState.state = messageBreak[0];
    
    switch (normalize(messageText)) {
        case normalize('Atualizar_Configuracao'):
            userState.state = 'waiting_start_configuracao';
            break;

        case normalize('Ver_Configuracao'):
            userState.procesCont = 0;
            userState.titulo += await (messageText.replace(/[^a-zA-Z0-9]/g, ''));
            userState.state = 'waiting_ver_configuracao';
            await saveUserState(env, userId, userState);
            const [nomeSetings, phoneSetings, cepSetings, ruaPageSetings, bairroSetings, nmrAdssSetings, cidadeSetings, ufSetings, cmptSetings, descSetings, clrpSetings, clrsSetings] = _configData;

           const setings = `<b>⚙️ Configurações Atuais</b>\n\n<b>👤 Nome:</b>\n<i>${nomeSetings}</i>\n| /Atualizar_Nome_Configuracao |\n\n<b>📞 Telefone:</b>\n<i>${phoneSetings}</i>\n| /Atualizar_Tel_Configuracao |\n\n<b>📝 Descrição:</b>\n${indent}<i>${descSetings}</i>\n| /Atualizar_Descricao_Configuracao |\n\n<b>🎨 Cor Primária:</b> <i>#${clrpSetings}</i>\n| /Atualizar_PrimColor_Configuracao |\n<b>🎨 Cor Secundária:</b> <i>#${clrsSetings}</i>\n| /Atualizar_SecdColor_Configuracao |\n\n<b>🏠 Endereço:</b>\n<i>\n${indent}• ${ruaPageSetings}\n| /Atualizar_Rua_Configuracao |\n${indent}━━━━━━━━━━━━\n${indent}• ${nmrAdssSetings}\n| /Atualizar_Num_Configuracao |\n${indent}━━━━━━━━━━━━\n${indent}• ${cmptSetings}\n| /Atualizar_Complemento_Configuracao |\n${indent}━━━━━━━━━━━━\n${indent}• ${bairroSetings}\n| /Atualizar_Bairro_Configuracao |\n${indent}━━━━━━━━━━━━\n${indent}• ${cidadeSetings}\n| /Atualizar_Cidade_Configuracao |\n${indent}━━━━━━━━━━━━\n${indent}• ${ufSetings}\n| /Atualizar_UF_Configuracao |\n${indent}━━━━━━━━━━━━\n${indent}• ${cepSetings}\n| /Atualizar_Cep_Configuracao |\n</i>\n ———\n/${comandTemplateCatalog01} | /configuracao | /encerrar\n ———`;




            await sendMessage(`Sr. ${userName}.\nEstas são as configurações gerais do seu negócio:\n\n\n ${setings}`, chatId, env);
            break;

        default:
            break;
    }
    switch (normalize(userState.state)) {
        case normalize('Atualizar'):
            userState.procesCont = 0;
            userState.state = 'waiting_newconfig_configuracao';
            userState.texto = parseInt((configIndex.map(i => normalize(i))).indexOf(normalize(messageBreak[1])));
            await sendMessage(`Certo sr. ${userName},\nVamos atualizar o(a) ${messageBreak[1]} (${_configData[userState.texto]})!\n${indent}Me informe o novo ${messageBreak[1]}:`, chatId, env)
            await saveUserState(env, userId, userState);
            break;

        case normalize('waiting_newconfig_configuracao'):
            userState.procesCont = 0;
            userState.state = 'waiting_confirm_configuracao';
            await sendMessage(`Sr. ${userName},\nTem certeza que deseja substituir:\n| ${_configData[userState.texto]} |\n${indent}por\n | ${messageText} | `, chatId, env);
            _configData[userState.texto] = messageText;
            userState.titulo = _configData.join("-|-");
            await sendMessage(`/SIM${indent}-${indent}/NAO`, chatId, env)
            await saveUserState(env, userId, userState);
            break;

        case normalize('waiting_section_configuracao'):
            userState.procesCont = 0;
            userState.state = 'waiting_comands_configuracao';
            let configComands = '';
            configIndex.forEach((value) => {
                configComands += `\n/Atualizar_${normalize(value)}`
            })
            await sendMessage(`Olá sr. ${userName},\nO que precisa?\n/Atualizar_Configuracao | /Ver_Configuracao\n${configComands}`, chatId, env)
            await saveUserState(env, userId, userState);
            break;

        case normalize('waiting_start_configuracao'):
            userState.procesCont = 0;
            userState.state = 'waiting_name_configuracao';
            await sendMessage(`Saudações sr. ${userName}, Vamos atribuir as configurações básicas da página!\nMe informe o nome da empresa.:\n(fica melhor se as iniciais forem maiúsculas)`, chatId, env)
            await saveUserState(env, userId, userState);
            break;

        case normalize('waiting_name_configuracao'):
            userState.procesCont = 0;
            userState.titulo = messageText + '-|-';
            userState.state = 'waiting_phone_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, me informe por gentileza seu número de WhatsApp.:\n(apenas numeros com DDI e DDD)`, chatId, env);
            break;

        case normalize('waiting_phone_configuracao'):
            userState.procesCont = 0;
            if ((messageText.replace(/\D/g, '').length) < 11 || (messageText.replace(/\D/g, '').length) > 14) { await sendMessage(`***Digite apenas números, não se esqueça dos códigos DDI e DDD***\nO número tem no máximo 13 digitos`, chatId, env); break; }
            userState.titulo += messageText.replace(/\D/g, '') + '-|-';
            userState.state = 'waiting_cep_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, Agora me informe o seu CEP, com 8 digitos.:\nO Sr. pode consultar seu CEP aqui (https://buscaceprua.com.br)`, chatId, env);
            break;

        case normalize('waiting_cep_configuracao'):
            userState.procesCont = 0;
            if ((messageText.replace(/\D/g, '').length) < 8) { await sendMessage(`***Digite apenas números, o cep possui 8 digitos***\O sr. também pode consultar seu cep aqui (https://buscaceprua.com.br)`, chatId, env); }
            userState.titulo += messageText.replace(/\D/g, '') + '-|-';
            userState.state = 'waiting_rua_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, Agora me informe a rua do seu negócio.:`, chatId, env);
            break;

        case normalize('waiting_rua_configuracao'):
            userState.procesCont = 0;
            userState.titulo += messageText + '-|-';
            userState.state = 'waiting_bairro_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, Agora me informe o bairro do seu negócio.:`, chatId, env);
            break;

        case normalize('waiting_bairro_configuracao'):
            userState.procesCont = 0;
            userState.titulo += messageText + '-|-';
            userState.state = 'waiting_numero_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, Agora me informe o numero do seu negócio.:`, chatId, env);
            break;

        case normalize('waiting_numero_configuracao'):
            userState.procesCont = 0;
            userState.titulo += messageText.replace(/\D/g, '') + '-|-';
            userState.state = 'waiting_cidade_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, Agora me informe a cidade do seu negócio.:`, chatId, env);
            break;

        case normalize('waiting_cidade_configuracao'):
            userState.procesCont = 0;
            userState.titulo += messageText + '-|-';
            userState.state = 'waiting_uf_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, Agora me informe o UF do seu negócio.:`, chatId, env);
            break;

        case normalize('waiting_uf_configuracao'):
            userState.procesCont = 0;
            userState.titulo += messageText + '-|-';
            userState.state = 'waiting_complemento_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, se houver informe o complemento do seu negócio.:`, chatId, env);
            break;

        case normalize('waiting_complemento_configuracao'):
            userState.procesCont = 0;
            userState.titulo += messageText + '-|-';
            userState.state = 'waiting_descricao_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Certo sr. ${userName}, agora precisarei que o sr. me informe uma descrição para seu negócio.:`, chatId, env);
            break;

        case normalize('waiting_descricao_configuracao'):
            userState.procesCont = 0;
            userState.titulo += await brMap(messageText) + '-|-';
            userState.state = 'waiting_colorp_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Hello sr. ${userName}.\nAgora me informe a cor primária da sua marca no formato HEXADECIMAL.:\n(https://color.adobe.com/pt/create)`, chatId, env);
            break;

        case normalize('waiting_colorp_configuracao'):
            userState.procesCont = 0;
            userState.titulo += await (messageText.replace(/[^a-zA-Z0-9]/g, '')) + '-|-';
            userState.state = 'waiting_colors_configuracao';
            await saveUserState(env, userId, userState);
            await sendMessage(`Ok sr. ${userName}.\nAgora me informe a cor secundária da sua marca no formato HEXADECIMAL.:\n(https://color.adobe.com/pt/create)`, chatId, env);
            break;

        case normalize('waiting_colors_configuracao'):
            userState.procesCont = 0;
            userState.titulo += await (messageText.replace(/[^a-zA-Z0-9]/g, ''));
            userState.state = 'waiting_confirm_configuracao';
            await saveUserState(env, userId, userState);
            const [nomeSetings, phoneSetings, cepSetings, ruaPageSetings, bairroSetings, nmrAdssSetings, cidadeSetings, ufSetings, cmptSetings, descSetings, clrpSetings, clrsSetings] = userState.titulo.split('-|-');
            const setings = `<b>Nome:</b> <i>${nomeSetings}</i>\n<b>Telefone:</b><i>${phoneSetings}</i>\n<b>Endereço:</b> <i>${ruaPageSetings}, ${nmrAdssSetings}, ${cmptSetings}, ${bairroSetings}, ${cidadeSetings} - ${ufSetings}, ${cepSetings}</i>\n<b>Descrição:</b> <i>${descSetings}</i>\n<b>Cor Primaria:</b> <i>${clrpSetings}</i>\n<b>Cor Secundária:</b> <i>${clrsSetings}</i>`
            await sendMessage(`Por fim sr. ${userName}.\nPor gentileza me confirme se os dataSave estão corretos\n ${setings}`, chatId, env);
            await sendMessage('/SIM esta correto! /NAO esta correto!', chatId, env);
            break;

        case normalize('waiting_confirm_configuracao'):
            userState.procesCont = 0;
            const dataSetings = [(userState.titulo), 'general']
            return await yesOrNo(dataSetings, ['config', 'data,type'], userId, chatId, userState, messageText, env);
    }
    return new Response('OK'); // Garantia de retorno
}

async function handleVerdataSaveFlow(userState, messageText, userId, chatId, userName, update, env) {
    //Mome da empresa - whatsapp - cep - rua - bairro - numero - cidade - uf - complemento - descrição - 

}
// -----------------------------------------------------------------------------
// FUNÇÃO ROUTER PRINCIPAL (templateCatalog01)
// -----------------------------------------------------------------------------

async function templateCatalog01(userState, messageText, userId, chatId, userName, update, env) {

    // 1. Lógica de Proteção contra Loop e Contagem de Processos
    if (userState.procesCont > 3) {
        await sendMessage('falha na requisição (loop detectado)', chatId, env);
        await saveUserState(env, userId, null);
        return new Response('Falha na requisição');
    } else {
        userState.procesCont++;
    }

    if (normalize(messageText) == normalize(comandTemplateCatalog01)) {
        try {
            const configGeneral = await dataExist("config", { type: "general" }, env, chatId);
            //await sendCallBackMessage(configGeneral, chatId,env);
            if (configGeneral) {
                userState.procesCont = 0;
                userState.proces = comandTemplateCatalog01;
                userState.state = 'waiting_section';
                await saveUserState(env, userId, userState);
                await sendMessage(`Olá ${userName}! Como posso ajudar?\n /ItemsMenu - /Destaques |\n/usuarios - /configuracao |\n\n /ver_dados_da_pagina - /encerrar`, chatId, env);
                return new Response('Aguardando comando', { status: 200 });
            } else {
                userState.procesCont = 0;
                userState.proces = comandTemplateCatalog01;
                userState.state = 'waiting_start_configuracao';
                return await handleConfiguracaoFlow(userState, messageText, userId, chatId, userName, update, env);
            }
        } catch (error) {
            const reqErr = "Erro na requisição " + comandTemplateCatalog01 + "(templateCatalog01) : " + error.stack;
            await sendCallBackMessage(reqErr, chatId, env);
            console.error(reqErr);
            return new Response(reqErr, { status: 200 });
        }
    }
    // 2. Lógica de Atualização de Estado Composto (Ex: waiting_section -> waiting_section_configuracao)
    if (userState.state == "waiting_section" || userState.state.includes("waiting_comand")) {
        if (messageText == '/ver_dataSave_da_pagina') {
            return await handleVerdataSaveFlow(userState, messageText, userId, chatId, userName, update, env);
        } else {
            userState.state += '_' + await normalize(messageText);
            await saveUserState(env, userId, userState);
        }
    }

    // 3. Verifica estado de recebimento de mídia (Inicializa o fluxo se a mensagem for um arquivo)
    // Se não há um processo ativo e a mensagem NÃO é apenas texto, inicializa o fluxo de mídia.
    if (userState.proces === '' && (update.message?.photo || update.message?.document || update.message?.video) && !userState.state) {
        userState.state = 'received_midia';
    }

    // Determina a seção ativa para roteamento
    let sectionActive = ((userState.state).toLowerCase()).split('_');
    let sectionName = sectionActive.find(name => ['configuracao', 'itemsmenu', 'cabecalho'].includes(name));

    // Roteamento para a função de fluxo correspondente
    switch (sectionName) {

        case 'dataSave':
            return await handleVerdataSaveFlow(userState, messageText, userId, chatId, userName, update, env);
            break;

        case 'itemsmenu':
            return await handleItensMenuFlow(userState, messageText, userId, chatId, userName, update, env);
            break;

        case 'configuracao':
            return await handleConfiguracaoFlow(userState, messageText, userId, chatId, userName, update, env);
            break;

        default:
            userState = null;
            await saveUserState(env, userId, userState);
            const mensagem = 'Comando ou estado de usuário desconhecido.';
            await sendMessage(mensagem, chatId, env);
            await sendMessage(" /catalogo\n /comandos - /encerrar", chatId, env);
            return new Response(mensagem, { status: 200 });
    }
}

export { templateCatalog01 }