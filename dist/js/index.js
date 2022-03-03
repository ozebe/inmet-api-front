import alert from "./alert.js";

const dtAtual = new Date();

async function carregaSatelites() {
    try {
        const response = await fetch('https://apisat.inmet.gov.br/satelites', { method: 'GET' });
        const satelites = await response.json();

        let output = '';
        for (let satelite of satelites) {
            output += `
            <option value="${satelite.sigla}">${satelite.nome}</option>`;
        }
        document.querySelector('#satelites').innerHTML = output;

        carregaAreasPorSatelite();

    } catch (error) {
        console.error(error);
    }
}

async function carregaAreasPorSatelite() {
    try {
        const sigla = document.getElementById("satelites").value;
        const response = await fetch(`https://apisat.inmet.gov.br/areas/${sigla}`);
        const areas = await response.json();

        let output = '';
        for (let area of areas) {
            output += `
            <option value="${area.sigla}">${area.nome}</option>`;
        }
        document.querySelector('#area-satelite').innerHTML = output;

        carregaParametrosPorSatelite(sigla, areas[0].sigla);

    } catch (error) {
        console.log(error);
    }
}

async function carregaParametrosPorSatelite(sigla, area) {
    try {

        const response = await fetch(`https://apisat.inmet.gov.br/parametros/${sigla}/${area}`);
        const parametros = await response.json();

        let output = '';
        for (let parametro of parametros) {
            output += `
            <option value="${parametro.sigla}">${parametro.nome}</option>`;
        }
        document.querySelector('#parametros').innerHTML = output;

        carregaHorariosPorSatelite(sigla, area, parametros[0].sigla);

    } catch (error) {
        console.log(error);
    }
}

async function carregaHorariosPorSatelite(sigla, area, parametro) {
    try {
        const response = await fetch(`https://apisat.inmet.gov.br/horas/${sigla}/${area}/${parametro}/${dtAtual.getUTCFullYear()}-${dtAtual.getMonth() + 1}-${dtAtual.getUTCDate()}`);
        const horarios = await response.json();

        let output = '';
        for (let horario of horarios) {
            output += `
            <option value="${horario.sigla}">${horario.nome}</option>`;
        }
        document.querySelector('#horarios').innerHTML = output;

    } catch (error) {
        console.log(error);
    }
}

async function carregaImagem(evt) {
    evt.preventDefault();
    alert('Carregando, aguarde... &#128564; &#128564;', 'warning');

    var satelite = document.querySelector('#satelites').value;
    var regiao = document.querySelector('#area-satelite').value;
    var parametro = document.querySelector('#parametros').value;
    var horario = document.querySelector('#horarios').value;

    const getDados = await fetch(`https://apisat.inmet.gov.br/${satelite}/${regiao}/${parametro}/${dtAtual.getUTCFullYear()}-${dtAtual.getMonth() + 1}-${dtAtual.getUTCDate()}/${horario}`, { method: 'GET' });
    const dados = await getDados.json();

    if (dados.base64.length <= 40) {
        alert('Não foi possível carregar a imagem no horário especificado.', 'danger');
    }else{
        var image = new Image();
        image.src = '' + dados.base64;
    
        insereImagem(image.src);
        insereBtnLimpar();

        document.getElementById('liveAlertPlaceholder').innerHTML = "";
    }

}

//função para inserir a imagem na DIV correspondente
function insereImagem(src){
    var imagePlaceHolder = document.getElementById('img-result');
    var wrapper = document.createElement('div');
    wrapper.innerHTML = '<img src="' + src +'"' + 'class="img-fluid" alt="Responsive image" id="imagem-satelite">'; 

    imagePlaceHolder.innerHTML = "";
    imagePlaceHolder.append(wrapper);  
}


//retorna um array com todos os horários disponiveis por sigla, area e parametro do satelite.
async function horariosPorSatelite(sigla, area, parametro) {
    try {
        const response = await fetch(`https://apisat.inmet.gov.br/horas/${sigla}/${area}/${parametro}/${dtAtual.getUTCFullYear()}-${dtAtual.getMonth() + 1}-${dtAtual.getUTCDate()}`);
        const horarios = await response.json();

        var horariosDisponiveis = [];

        for (let horario of horarios) {
            horariosDisponiveis.push(horario.sigla);
        }

        horariosDisponiveis.reverse();
        return horariosDisponiveis;

    } catch (error) {
        console.log(error);
    }
}

async function mesclaImagensDisponiveis(satelite, regiao, parametro) {
    var imagensDisponiveis = [];

    var horarios = await horariosPorSatelite(satelite, regiao, parametro)

    Promise.all(horarios.map(horas => 
        fetch(`https://apisat.inmet.gov.br/${satelite}/${regiao}/${parametro}/${dtAtual.getUTCFullYear()}-${dtAtual.getMonth() + 1}-${dtAtual.getUTCDate()}/${horas}`, { method: 'GET' }).then(function(response){
			return response.json();
        }).then(function(json){
            if(json == 'You have reached the request limit.'){
               return;
           }
            if(json.base64.length > 22){
                let image = new Image(); 
                image.src = '' + json.base64; 
                image.hora = json.hora;
                //image.onload = () =>{console.log(image.width)}; 
                imagensDisponiveis.push(image);
                return image; 
            }
        })
    )).then(data => {

        //remove resultados vazios
        data = data.filter(function (el) {
            return el != null;
          });

        //instância objeto do GIF
        var gif = new GIF({
            workers: 2,
            workerScript: './dist/js/gif.worker.js',
            quality: 10
        });
        

        // adiciona os frames para cada imagem carregada pela API
        data.forEach((image) => {
            gif.addFrame(image);
        });
        
        // ao finalizar...
        gif.on('finished', (blob) => {
            // do something with the generated gif file
            var blobUrl = URL.createObjectURL(blob);
            // like (try to) open it in a new tab (it might get popup-blocked):
            //window.open(blobUrl, '_blank');
            
            //insere a imagem na DIV correspondente
            insereImagem(blobUrl);
            
            //ativa novamente o botão e remove o aviso.
            document.querySelector('#btn-gera-gif').disabled = false;
            document.getElementById('liveAlertPlaceholder').innerHTML = "";
            insereBtnLimpar();

        });
    
        gif.render();
    });
}

async function criaGif(evt){
    evt.preventDefault();

    alert('Carregando, aguarde... &#128564; &#128564;', 'warning');
    document.querySelector('#btn-gera-gif').disabled = true;

    var satelite = document.querySelector('#satelites').value;
    var regiao = document.querySelector('#area-satelite').value;
    var parametro = document.querySelector('#parametros').value;

    mesclaImagensDisponiveis(satelite, regiao, parametro);
}

function limpaDados(evt){
    evt.preventDefault();

    document.getElementById('liveAlertPlaceholder').innerHTML = "";
    document.getElementById('form-limpa-img').innerHTML = "";
    document.getElementById('img-result').innerHTML = "";
}

function insereBtnLimpar(){
    var formLimpa = document.getElementById('form-limpa-img');
    formLimpa.innerHTML = "";
    formLimpa.innerHTML = '<input id="btn-limpa-img" class="btn btn-danger" type="submit" value="Limpar imagem">'
}

window.onload = function () {
    carregaSatelites();

    var selectSatelite = document.querySelector("#satelites");
    selectSatelite.addEventListener('change', carregaAreasPorSatelite);

    var selectArea = document.querySelector("#area-satelite");

    selectArea.addEventListener('change', carregaParametrosPorSatelite(document.getElementById("satelites").value, document.getElementById("area-satelite").value));

    document.querySelector('#form-carrega-imagem').addEventListener('submit', carregaImagem, false);
    document.querySelector('#form-gera-gif').addEventListener('submit', criaGif, false);
    document.querySelector('#form-limpa-img').addEventListener('submit', limpaDados, false);
}
