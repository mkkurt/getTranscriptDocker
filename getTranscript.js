import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { parse } from "node-html-parser";
import { JSDOM } from "jsdom";
import pdf from "html-pdf";
import qs from "qs";
import { CookieJar } from "tough-cookie";

const getTranscript = async (id, password, pin) => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));
  const res = await client.get("http://uzay.sis.itu.edu.tr/login/index.php");
  const url = res.request.res.responseUrl;
  const root = parse(res.data);
  const viewstate = root.querySelector("#__VIEWSTATE").attributes.value;
  const eventvalidation =
    root.querySelector("#__EVENTVALIDATION").attributes.value;
  const viewstategenerator = root.querySelector("#__VIEWSTATEGENERATOR")
    .attributes.value;
  const data = qs.stringify({
    __VIEWSTATE: viewstate,
    __VIEWSTATEGENERATOR: viewstategenerator,
    __EVENTVALIDATION: eventvalidation,
    ctl00$ContentPlaceHolder1$tbUserName: id,
    ctl00$ContentPlaceHolder1$tbPassword: password,
    ctl00$ContentPlaceHolder1$btnLogin: "Giriş+/+Login",
  });

  const config = {
    method: "post",
    url: url,
    data: data,
  };

  const res2 = await client.request(config);
  const sessionId = res2.request.res.responseUrl.split("SessionId=")[1];
  console.log(res2.data);
  let ituID = parse(res2.data).querySelector("#UserID").innerText; //e.g. "820170021"
  //remove spaces from ituID
  ituID = ituID.replace(/\s/g, "");
  const data2 = qs.stringify({
    sid: ituID,
    PIN: pin,
    SessionId: sessionId,
  });
  const config2 = {
    method: "post",
    url: "http://ssb.sis.itu.edu.tr:9000/pls/PROD/twbkwbis.P_ValLogin",
    data: data2,
  };
  const res3 = await client.request(config2);
  const root3 = parse(res3.data);
  let redirectUrl = root3.querySelector("meta").attributes.content;
  redirectUrl = redirectUrl.split("url=")[1];
  redirectUrl = redirectUrl.split("&")[0];

  const res4 = await client.get("http://ssb.sis.itu.edu.tr:9000" + redirectUrl);
  const res5 = await client.get(
    "http://ssb.sis.itu.edu.tr:9000/pls/PROD/p_transcript_en.p_id_response"
  );
  const transcript = res5.data; //THIS IS THE TRANSCRIPT PAGE !!
  let table = new JSDOM(transcript).window.document.querySelector(
    "body > div.pagebodydiv > table:nth-child(1) > tbody"
  ).innerHTML;
  //remove image elements
  table = table.replace(/<img[^>]*>/g, "");
  //turn into pdf
  const options = {
    format: "Letter",
    border: {
      top: "1in",
      right: "1in",
      bottom: "1in",
      left: "1in",
    },
  };
  //promise to wait for pdf to be created
  const pdfPromise = new Promise((resolve, reject) => {
    pdf.create(table, options).toFile("transcript.pdf", (err, res) => {
      if (err) {
        reject(err);
      } else {
        console.log("PDF created");
        resolve(res);
        // try {
        //   open("transcript.pdf");
        //   console.log("PDF opened");
        // } catch (error) {
        //   console.log(error);
        // }
      }
    });
  });
  return pdfPromise;
};

export default getTranscript;
