import fs from "fs";
import path from "path";
import _ from "lodash";
import { PhoneNumber } from "google-libphonenumber";
import * as EmailValidator from "email-validator";

const PNF = require("google-libphonenumber").PhoneNumberFormat;
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
interface Addresses {
  type: string;
  tags: string[];
  address: string;
}

function formatPhone(value: PhoneNumber) {
  return `${value.getCountryCode()}${value.getNationalNumber()}`;
}

function verifyIsValidPhone(value: PhoneNumber): boolean {
  return phoneUtil.isValidNumber(value);
}

function verifyIsValidEmail(value: string): boolean {
  return EmailValidator.validate(value);
}

function formatBooleanData(value: any): Boolean {
  if (value == "yes") {
    value = true;
  } else if (value == "no") {
    value = false;
  } else if (value == 0) {
    value = false;
  } else if (value == 1) {
    value = true;
  }

  return Boolean(value);
}

function createAddress(header: string, property: string) {
  let addressHeader = header.split(" ");
  let addressType = addressHeader[0];

  addressHeader = _.drop(addressHeader);

  let addressTags = addressHeader;

  if (addressType == "phone") {
    if (/\d/.test(property)) {
      //verifys if has any number on the data
      let phone = phoneUtil.parseAndKeepRawInput(property, "BR");
      if (verifyIsValidPhone(phone)) {
        property = formatPhone(phone);
        return { type: addressType, tags: addressTags, address: property };
      } else {
        return null;
      }
    } else {
      return null;
    }
  } else if (addressType == "email") {
    let validEmail = "";
    let emails = property.split(" ");
    emails.map((value) => {
      if (verifyIsValidEmail(value)) {
        validEmail = value;
      }
    });
    if (validEmail != "") {
      return { type: addressType, tags: addressTags, address: validEmail };
    }
  }
  return null;
}

function verifyEqualHeaders(
  headers: string[],
  differentHeaders: string[],
  equalHeaders: string[]
) {
  for (let i = 0; i < headers.length; i++) {
    let header = "";

    //remove quotes
    for (let ch of headers[i]) {
      if (ch == '"') ch = "";
      header += ch;
    }

    if (differentHeaders.indexOf(header) != -1) {
      let index = differentHeaders.indexOf(header);

      if (equalHeaders.indexOf(header) == -1) {
        equalHeaders.push(header);
      }
    } else {
      differentHeaders.push(header);
    }

    headers[i] = header;
  }
}

function main() {
  const file = fs.readFileSync(path.join(__dirname, "./input.csv"), "utf8");

  const input = file.toString().split("\n");

  let result = [];

  let headers = input[0].split(",");

  let differentHeaders: string[] = [];
  let equalHeaders: string[] = [];

  //remove quotes, verify equal headers
  verifyEqualHeaders(headers, differentHeaders, equalHeaders);

  //go through the lines of the file, except for the header
  for (let i = 1; i < input.length; i++) {
    if (input[i] == "") {
      continue;
    }

    let existsObj = false;
    let indexResult: any;

    let obj: {
      [key: string]: any;
    } = {};

    let addresses: Addresses[] = [];

    let str = input[i];
    let s = "";
    let addAddress;

    //verifys separators and characters
    let flag = 0;
    for (let ch of str) {
      if (ch === '"' && flag === 0) {
        flag = 1;
      } else if (ch === '"' && flag == 1) flag = 0;
      if (ch === "," && flag === 1) ch = "/";
      if (ch === "," && flag === 0) ch = "|";
      if (ch !== '"') s += ch;
    }

    let properties = s.split("|");

    //go through each cell of each line of the file
    for (let j in headers) {
      let data;

      //checks if person already exists
      if (headers[j] == "eid") {
        result.map((value, index) => {
          if (properties[j] == value[headers[j]]) {
            obj = value;

            addresses = obj["addresses"];

            existsObj = true;
            indexResult = index;
          }
        });
      }

      //checks if the cell contains more than one data
      if (properties[j].includes("/")) {
        data = properties[j].split("/").map((item) => item.trim()); //split the cell data
        //checks if the header contain tags, so is an address header
        if (headers[j].includes(" ")) {
          data.map((item) => {
            //for each address data, creates a new address
            addAddress = createAddress(headers[j], item);
            if (addAddress != null) {
              addresses.push(addAddress);
            }
          });
        }
        //checks if is not an empty cell
      } else if (properties[j] != "") {
        data = properties[j].trim();
        //checks if the header contain tags, so it is an address header
        if (headers[j].includes(" ")) {
          addAddress = createAddress(headers[j], data);
          if (addAddress != null) {
            addresses.push(addAddress);
          }
        }
      }

      //checks if it is an address header or not
      if (!headers[j].includes(" ")) {
        //checks if it is an header that repeats
        if (equalHeaders.includes(headers[j])) {
          //checks if the data contains more than one information
          if (typeof data == "object") {
            //for each information concatenates to the obejct that already exists
            data.map((value) => {
              if (!_.includes(obj[headers[j] + "s"], value)) {
                obj[headers[j] + "s"] = _.concat(obj[headers[j] + "s"], value);
              }
            });
          } else {
            if (!_.includes(obj[headers[j] + "s"], data)) {
              obj[headers[j] + "s"] = _.concat(obj[headers[j] + "s"], data); //concatenates the information to the object that already exists
            }
          }
        } else {
          //checks if it is one of the boolean data headers
          if (headers[j] == "invisible" || headers[j] == "see_all") {
            obj[headers[j]] = formatBooleanData(data);
          } else {
            obj[headers[j]] = data;
          }
        }
      } else {
        obj["addresses"] = addresses;
      }

      //removes any null or empty values from the object
      _.remove(obj[headers[j]], (value) => {
        return value == null || value == "";
      });

      _.remove(obj[headers[j] + "s"], (value) => {
        return value == null || value == "";
      });
    }

    //verifys if the object already exists on the result array
    if (existsObj) {
      result[indexResult] = obj;
    } else {
      result.push(obj);
    }

    existsObj = false;
  }

  let json = JSON.stringify(result, null, 2);

  fs.writeFileSync(path.join(__dirname, "./output.json"), json);
}

main();
