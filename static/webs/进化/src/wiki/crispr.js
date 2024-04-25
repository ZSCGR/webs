import { global } from './../vars.js';
import { loc } from './../locale.js';
import { genePool } from './../arpa.js';
import { sideMenu } from './functions.js';

export function crisprPage(content){
    content.append(`<div class="header has-text-warning">${loc('wiki_arpa_crispr')}</div>`);

    let mainContent = $(`<div></div>`);
    let crisprContent = sideMenu('create',mainContent);
    content.append(mainContent);

    Object.keys(genePool).forEach(function (gene){
        let id = genePool[gene].id.split('-');
        let info = $(`<div id="${id[1]}" class="infoBox"></div>`);
        crisprContent.append(info);
        geneDesc(info,gene);
        sideMenu('add',`crispr-prestige`,id[1],genePool[gene].title);
    });
}

const specialRequirements = {
    universal: [
        {
            title: loc(`wiki_tech_special_universe_not`,[loc(`universe_standard`)]),
            color: global.race.universe !== 'standard',
            link: 'wiki.html#universes-gameplay-standard'
        }
    ],
    standard: [
        {
            title: loc(`wiki_tech_special_universe_not`,[loc(`universe_standard`)]),
            color: global.race.universe !== 'standard',
            link: 'wiki.html#universes-gameplay-standard'
        }
    ],
    ancients: [
        {
            title: loc(`wiki_arpa_crispr_special_ancients`),
            color: global.genes['old_gods'] ? true : false,
            link: 'wiki.html#resets-prestige-intro'
        }
    ],
    bleeding_effect: [
        {
            title: loc(`wiki_tech_special_universe`,[loc(`universe_antimatter`)]),
            color: global.race.universe === 'antimatter',
            link: 'wiki.html#universes-gameplay-antimatter'
        }
    ],
    blood_remembrance: [
        {
            title: loc(`wiki_arpa_crispr_special_blood_remembrance`),
            color: global.prestige.Blood_Stone.count >= 1,
            link: 'wiki.html#resources-prestige-blood'
        }
    ]
}

var crisprTrees = {};
Object.keys(genePool).forEach(function (gene){
    let crispr = genePool[gene];
    if (!crisprTrees[crispr.grant[0]]){
        crisprTrees[crispr.grant[0]] = {};
    }
    let text = typeof genePool[gene].title === 'string' ? genePool[gene].title : genePool[gene].title();
    crisprTrees[crispr.grant[0]][crispr.grant[1]] = {
        name: gene
    };
});

function geneDesc(info,gene){
    let owned = global.genes[genePool[gene].grant[0]] && global.genes[genePool[gene].grant[0]] >= genePool[gene].grant[1] ? true : false;

    info.append(`<div class="type"><h2 class="has-text-warning">${genePool[gene].title}</h2>${owned ? `<span class="is-sr-only">${loc('wiki_arpa_purchased')}</span>` : ``}<span class="has-text-${owned ? `success` : `caution`}">${loc(`wiki_arpa_crispr_${genePool[gene].grant[0]}`)}: ${genePool[gene].grant[1]}</span></div>`);

    let stats = $(`<div class="stats"></div>`);
    info.append(stats);

    stats.append(`<div class="effect">${genePool[gene].desc}</div>`);

    let costs = $(`<div class="cost right"></div>`);
    stats.append(costs);
    Object.keys(genePool[gene].cost).forEach(function(res){
        let res_cost = genePool[gene].cost[res]();
        if (res_cost > 0){
            if (res === 'Plasmid' && global.race.universe === 'antimatter'){
                res = 'AntiPlasmid';
            }
            let label = loc(`resource_${res}_name`);
            costs.append(`<div><span class="has-text-warning">${label}</span>: <span data-${res}="${res_cost}">${res_cost}</span></div>`);
        }
    });

    if (Object.keys(genePool[gene].reqs).length > 0){        
        let reqs = $(`<div class="reqs"><span class="has-text-caution">${loc('wiki_arpa_crispr_req')}</span></div>`);
        info.append(reqs);

        let comma = false;
        Object.keys(genePool[gene].reqs).forEach(function (req){
            let color = global.genes[req] && global.genes[req] >= genePool[gene].reqs[req] ? 'success' : 'danger';
            reqs.append(`${comma ? `, ` : ``}<span><a href="wiki.html#crispr-prestige-${crisprTrees[req][genePool[gene].reqs[req]].name}" class="has-text-${color}" target="_blank">${loc(`wiki_arpa_crispr_${req}`)} ${genePool[gene].reqs[req]}</a></span>`);
            comma = true;
        });
    }
    if (specialRequirements.hasOwnProperty(gene)){
        let comma = false;
        let specialReq = $(`<div class="reqs"><span class="has-text-caution">${loc('wiki_arpa_crispr_req_extra')}</span></div>`);
        info.append(specialReq);
        Object.keys(specialRequirements[gene]).forEach(function (req){
            let color = specialRequirements[gene][req].color ? 'success' : 'danger';
            let text = specialRequirements[gene][req].link ? `<a href="${specialRequirements[gene][req].link}" class="has-text-${color}" target="_blank">${specialRequirements[gene][req].title}</a>` : specialRequirements[gene][req].title;
            specialReq.append(`${comma ? `, ` : ``}<span class="has-text-${color}">${text}</span>`);
            
            comma = true;
        });
    }
}